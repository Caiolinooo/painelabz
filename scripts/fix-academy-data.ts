import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const { createClient } = await import('@supabase/supabase-js');
  const { generateAndStoreCertificate } = await import('../src/lib/certificates');

  const supabaseUrl = ***REMOVED***;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ***REMOVED***;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = ***REMOVED*** supabaseKey);

  console.log('Starting Academy Data Cleanup...');

  // 1. Fetch all courses
  const { data: courses, error: errC } = await supabase.from('academy_courses').select('id');
  if (errC) throw errC;
  const courseIds = new Set((courses || []).map(c => c.id));
  console.log(`Found ${courseIds.size} courses.`);

  // 2. Fetch all enrollments
  const { data: enrollments, error: errE } = await supabase.from('academy_enrollments').select('*');
  if (errE) throw errE;
  console.log(`Found ${enrollments.length} total enrollments.`);

  const toDelete = [];
  const validEnrollments = [];

  // Group by user_id + course_id
  const userCourseMap = new Map();

  for (const enr of enrollments) {
    if (!courseIds.has(enr.course_id)) {
      console.log(`Enrollment ${enr.id} for course ${enr.course_id} is invalid (course not found). Marking for deletion.`);
      toDelete.push(enr.id);
      continue;
    }

    const key = `${enr.user_id}_${enr.course_id}`;
    if (!userCourseMap.has(key)) {
      userCourseMap.set(key, []);
    }
    userCourseMap.get(key).push(enr);
  }

  // Deduplicate
  for (const [key, userEnrollments] of userCourseMap.entries()) {
    if (userEnrollments.length > 1) {
      // Sort to find the best one to keep:
      // First, prefer those with completed_at !== null
      // Second, prefer those with the latest enrolled_at
      userEnrollments.sort((a, b) => {
        if (a.completed_at && !b.completed_at) return -1;
        if (!a.completed_at && b.completed_at) return 1;
        return new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime();
      });

      const keep = userEnrollments[0];
      const drops = userEnrollments.slice(1);
      
      validEnrollments.push(keep);
      console.log(`Keeping duplicate winner: ${keep.id}`);
      for (const d of drops) {
        console.log(`Dropping duplicate enrollment: ${d.id}`);
        toDelete.push(d.id);
      }
    } else {
      validEnrollments.push(userEnrollments[0]);
    }
  }

  // Delete invalid / duplicated
  if (toDelete.length > 0) {
    console.log(`Deleting ${toDelete.length} invalid/duplicated enrollments...`);
    // Delete in chunks of 100
    for(let i=0; i<toDelete.length; i+=100){
      const chunk = toDelete.slice(i, i+100);
      await supabase.from('academy_enrollments').delete().in('id', chunk);
    }
    console.log('Deletions completed.');
  } else {
    console.log('No enrollments to delete.');
  }

  // 3. Regenerate Certificates
  console.log('Regenerating certificates...');
  let regenerated = 0;
  for (const enr of validEnrollments) {
    if (enr.completed_at) {
      console.log(`Regenerating certificate for enrollment ${enr.id}...`);
      try {
        await generateAndStoreCertificate(enr.id);
        regenerated++;
      } catch(err) {
        console.error(`Error regenerating certificate for ${enr.id}:`, err);
      }
    }
  }

  console.log(`Finished! Regenerated ${regenerated} certificates.`);
}

main().catch(console.error);
