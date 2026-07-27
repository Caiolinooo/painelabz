import { redirect } from 'next/navigation';

export default function AdminLeaveApprovalsRedirectPage() {
    redirect('/ferias?tab=approvals');
}
