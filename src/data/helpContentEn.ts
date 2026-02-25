import { HelpCategory } from './helpContent';

export const helpCategoriesEn: HelpCategory[] = [
    // ==========================================
    // CATEGORY: ABZ PORTAL
    // ==========================================
    {
        id: 'onboarding',
        name: 'Onboarding',
        description: 'First steps in the ABZ Portal',
        icon: 'FiLogIn',
        articles: [
            {
                id: 'o-que-e-portal',
                title: 'What is the ABZ Portal?',
                content: `
## What is the ABZ Portal?

The **ABZ Portal** is an exclusive information center for ABZ Group employees.

### What you will find on the portal:

- 📋 **Procedures** - Operational manuals and guides
- 📜 **Policies** - Company rules and regulations
- 📅 **Calendar** - Events and important dates
- 📰 **ABZ News** - News and announcements
- 💰 **Reimbursements** - Request and tracking
- 🎓 **Academy** - Training and courses
- 📊 **Evaluation** - Performance and feedback

### Access

Access via the link: **https://portal.groupabz.com**
        `,
                category: 'onboarding',
                keywords: ['portal', 'abz', 'what is', 'home', 'about']
            },
            {
                id: 'instalar-app',
                title: 'How to download the ABZ Portal App?',
                content: `
## Installing the ABZ Portal App

The ABZ Portal can be installed as an app on your computer or phone for quick access.

### Step-by-step:

1. **Access the portal** via your browser:
   - Link: \`https://portal.groupabz.com/dashboard\`

2. **Click on the install icon**:
   - On Chrome/Edge: click the **"Install application"** icon in the address bar (next to the search icon)

3. **Confirm the installation**:
   - Click **"Install"**
   - Check **"Pin to taskbar"** (optional)
   - Click **"Allow"**

4. **Done!**
   - The app will appear in your start menu and/or desktop

### Tip

For mobile, access the portal via the Chrome browser and use the "Add to Home Screen" option.
        `,
                category: 'onboarding',
                keywords: ['app', 'install', 'download', 'application', 'pwa'],
                images: [
                    '/images/help/instalar-app-1.png',
                    '/images/help/instalar-app-2.png',
                    '/images/help/instalar-app-3.png'
                ]
            },
            {
                id: 'mudar-senha',
                title: 'How to change the initial password?',
                content: `
## Changing your Password

For enhanced security, we recommend changing your initial password.

### Step-by-step:

1. **Click on your profile** (bottom left corner of the screen)

2. **Scroll down until you find "Change Password"**

3. **Fill in the fields**:
   - Current password
   - New password (minimum 8 characters)
   - Confirm new password

4. **Click "Change Password"**

### Password requirements:

- ✅ Minimum of **8 characters**
- ✅ Recommended: letters, numbers, and symbols

### Forgot your password?

Use the **"Forgot my password"** option on the login screen to receive a recovery email.
        `,
                category: 'onboarding',
                keywords: ['password', 'change', 'update', 'recover'],
                images: [
                    '/images/help/alterar-senha.png'
                ]
            },
            {
                id: 'reportar-erros',
                title: 'How to report errors?',
                content: `
## Reporting Errors on the Portal

Found a problem? Help us improve the portal by reporting the error.

### Step-by-step:

1. **Click the Help button** (question mark icon in the bottom right corner)

2. **Access the "Messages" tab**

3. **Select "Report an error/bug"**

4. **Describe the problem**:
   - What you were trying to do
   - What went wrong
   - What the expected behavior was

5. **Optionally**:
   - Use **"Capture Screen"** to take a screenshot
   - Attach files if necessary

6. **Click "Send"**

### Data sent automatically:

- Current page URL
- Browser information
- Console errors (if any)
        `,
                category: 'onboarding',
                keywords: ['error', 'bug', 'problem', 'report', 'help'],
                images: [
                    '/images/help/reportar-erro.png'
                ]
            }
        ]
    },
    {
        id: 'reembolso',
        name: 'Reimbursement',
        description: 'Reimbursement requests and tracking',
        icon: 'FiDollarSign',
        articles: [
            {
                id: 'preencher-formulario',
                title: 'How to fill out the reimbursement form?',
                content: `
## Filling out the Reimbursement Form

Follow the steps below to correctly request your reimbursement.

### Step-by-step:

1. **Access the "Reimbursement" card** on the dashboard

2. **Check your personal data**:
   - Name, email, phone
   - Correct if necessary

3. **Enter your CPF (ID)** (mandatory)

4. **Add expenses**:
   - Click **"Add Expense"**
   - Select the **type** (food, transport, etc.)
   - Enter the expense **date**
   - Enter the **amount**
   - Add a **justification**
   - **Attach the receipt** (photo of the invoice)

5. **Add more expenses if necessary**
   - You can include multiple expenses in a single request

6. **Choose the payment method**:
   - **Bank deposit**: enter bank, branch, and account details
   - **PIX**: enter PIX key type and key

7. **Review and send**:
   - Click **"Send Request"**

### Important:

- Attach legible receipts (invoice or receipt)
- The requested amount must exactly match the receipt
        `,
                category: 'reimbursement',
                keywords: ['reimbursement', 'form', 'fill', 'expense', 'request'],
                images: [
                    '/images/help/reembolso-formulario.png',
                    '/images/help/reembolso-adicionar.png'
                ]
            },
            {
                id: 'verificar-status',
                title: 'How to check my reimbursement status?',
                content: `
## Checking Reimbursement Status

Track the progress of your reimbursement request.

### Step-by-step:

1. **Access the "Reimbursement" card** on the dashboard

2. **Click the "My Reimbursements" tab**

3. **View your requests**:
   - Each row shows a request
   - Check the **"Status"** column

### Status meanings:

- 🟡 **Pending** - Awaiting manager analysis
- 🔵 **Under Review** - Being reviewed
- 🟢 **Approved** - Approved, awaiting payment
- ✅ **Paid** - Amount deposited in your account
- 🔴 **Rejected** - Not approved (see reason)

### Notifications:

- You will receive an email upon every status change
- Also check your spam folder
        `,
                category: 'reimbursement',
                keywords: ['status', 'track', 'check', 'approved', 'paid', 'pending'],
                images: [
                    '/images/help/reembolso-status.png'
                ]
            }
        ]
    },
    {
        id: 'contracheque',
        name: 'Pay Stub',
        description: 'Access to pay stubs and receipts',
        icon: 'FiFileText',
        articles: [
            {
                id: 'acessar-contracheque',
                title: 'How to access my pay stub?',
                content: `
## Accessing the Pay Stub

The pay stub is available through the WK Radar system.

### Step-by-step:

1. **Go to the link**:
   - \`http://wk.groupabz.com/radarwebnet\`

2. **Select** the option **"Employee Portal"**

3. **Log in**:
   - **User**: Your CPF (numbers only)
   - **Password**: \`1\` (for first access)

4. **Click "Receipt"**

5. **Log in again** (system prompt)

6. **View or print** your pay stub

### First access:

- The initial password is **"1"**
- We recommend changing the password after the first access

### Access problems?

- Ensure the CPF is correct (no dots or dashes)
- Contact HR if the problem persists
        `,
                category: 'pay-stub',
                keywords: ['pay stub', 'receipt', 'salary', 'wk', 'radar']
            }
        ]
    },
    {
        id: 'rede-publica',
        name: 'Public Network (Z: Drive)',
        description: 'Access to shared files and documents',
        icon: 'FiMonitor',
        articles: [
            {
                id: 'o-que-e-drive-z',
                title: 'What is the Public Network (Z: Drive)?',
                content: `
## Public Network - Z: Drive

The **Z: Drive** is the internal file server for ABZ Group.

### How to access:

1. **Open Windows File Explorer**

2. **Navigate to "This PC"**

3. **Look for "Data-ABZ (Z:)"**

4. **Double-click** to open

### Folder structure:

- \`Z:\\1. Publico\` - Company public documents
- \`Z:\\1. Publico\\3. Modelos diversos\` - Editable templates
- \`Z:\\1. Publico\\4. Comunicação\` - Logos and visual identity

### Important:

- Never save personal files on the public network
- Always create a **copy** before editing a template
        `,
                category: 'public-network',
                keywords: ['drive', 'z', 'network', 'public', 'files', 'server'],
                images: [
                    '/images/help/rede-local.png',
                    '/images/help/rede-pastas.png',
                    '/images/help/rede-endereco.png'
                ]
            },
            {
                id: 'modelos-editaveis',
                title: 'Where can I find editable templates?',
                content: `
## Editable Templates

Standard company document templates are available on the network.

### Location:

\`Z:\\1. Publico\\3. Modelos diversos\`

### What you will find:

- Presentation templates
- Document templates
- Standard email signatures
- Other standard formats

### How to use:

1. **Navigate to the folder** above
2. **Find the desired template**
3. **Copy the file** to your machine or another folder
4. **Edit the copy** (never the original!)

> ⚠️ **Important**: Always create a copy before editing. Do not modify the original files on the network.
        `,
                category: 'public-network',
                keywords: ['model', 'template', 'editable', 'document', 'standard'],
                images: [
                    '/images/help/rede-modelos.png'
                ]
            },
            {
                id: 'logotipo-identidade',
                title: 'Where can I find the logo and visual identity?',
                content: `
## Logo and Visual Identity

Official ABZ Group brand materials.

### Location:

\`Z:\\1. Publico\\4. Comunicação\`

### What you will find:

- 🎨 **Logos** in various formats (PNG, JPG, PDF)
- 🔤 Official company **Fonts**
- 🎯 **Icons** and graphic elements
- 📖 **Brand Manual** - Guide for using the visual identity

### Tips:

- Always use the most recent versions of the logos
- Check the brand manual for correct usage
- If in doubt, contact the Communications team
        `,
                category: 'public-network',
                keywords: ['logo', 'brand', 'identity', 'visual', 'communications'],
                images: [
                    '/images/help/rede-comunicacao.png'
                ]
            }
        ]
    },
    {
        id: 'email',
        name: 'Email (Signature)',
        description: 'Email signature configuration',
        icon: 'FiFileText',
        articles: [
            {
                id: 'assinatura-outlook-classico',
                title: 'How to add a signature in Classic Outlook?',
                content: `
## Email Signature - Classic Outlook

Configure your standard ABZ Group signature.

### Step 1: Copy the template

1. Go to: \`Z:\\1. Publico\\3. Modelos diversos\`
2. Open the file: **"Assinatura de E-mail Padrão.docx"**
3. Select all content (Ctrl+A)
4. Copy (Ctrl+C)

### Step 2: Configure in Outlook

1. Open **Outlook**
2. Go to **File** > **Options** > **Mail** > **Signatures**
3. Click **"New"**
4. Give it a name (e.g., "Standard ABZ")
5. Paste the signature (Ctrl+V) into the editing area
6. **Update your details**:
   - Your name
   - Your function/role
   - Your WhatsApp (if applicable)

### Step 3: Set as default

1. Under "Choose default signature":
   - **New messages**: Select your signature
   - **Replies/forwards**: Select your signature
2. Click **OK**
        `,
                category: 'email',
                keywords: ['signature', 'email', 'outlook', 'classic', 'configure'],
                images: [
                    '/images/help/outlook-menu.png',
                    '/images/help/outlook-opcoes.png',
                    '/images/help/outlook-assinatura.png'
                ]
            },
            {
                id: 'assinatura-novo-outlook',
                title: 'How to add a signature in New Outlook?',
                content: `
## Email Signature - New Outlook

Configure your signature in the new Outlook (web/modern version).

### Step 1: Copy the template

1. Go to: \`Z:\\1. Publico\\3. Modelos diversos\`
2. Open: **"Assinatura de E-mail Padrão.docx"**
3. Select all (Ctrl+A) and copy (Ctrl+C)

### Step 2: Configure in New Outlook

1. Click the **gear icon** (Settings) in the top right corner
2. Go to **Mail** > **Compose and reply**
3. Scroll down to **"Email signature"**
4. Click **"New signature"**
5. Give it a name (e.g., "ABZ")
6. Paste the signature (Ctrl+V)
7. **Update your details**:
   - Name
   - Role
   - WhatsApp

### Step 3: Enable

1. Check the option **"Automatically include my signature on new messages I compose"**
2. Check **"Automatically include my signature on messages I forward or reply to"**
3. Click **Save**
        `,
                category: 'email',
                keywords: ['signature', 'email', 'outlook', 'new', 'web', 'configure'],
                images: [
                    '/images/help/novo-outlook-config.png',
                    '/images/help/novo-outlook-assinatura.png',
                    '/images/help/novo-outlook-salvar.png'
                ]
            }
        ]
    },
    {
        id: 'teams',
        name: 'Teams',
        description: 'Microsoft Teams Configuration',
        icon: 'FiMessageSquare',
        articles: [
            {
                id: 'fundo-reunioes',
                title: 'How to add a background for meetings?',
                content: `
## Meeting Backgrounds in Teams

Customize the background of your video calls.

### Where to find ABZ backgrounds:

Official ABZ backgrounds are at:
\`Z:\\1. Publico\\4. Comunicação\\Perfis e Capas\`

### During a meeting:

1. Click **"More actions"** (three dots)
2. Select **"Video effects and settings"** or **"Apply background effects"**
3. Choose an option:
   - **Blur** - Blurs the background
   - **Standard image** - Select one of the Teams images
   - **Add new** - Upload your own image

### Before a meeting:

1. When joining a meeting, before clicking "Join now"
2. Turn on your camera
3. Click **"Background filters"**
4. Choose or upload an image

### Tip:

Download backgrounds from the network folder to your computer before using them in Teams.
        `,
                category: 'teams',
                keywords: ['teams', 'background', 'meeting', 'video']
            },
            {
                id: 'foto-perfil-teams',
                title: 'How to change the profile picture in Teams?',
                content: `
## Changing Profile Picture in Teams

Update your profile picture for easier identification.

### Step-by-step:

1. **Open Teams**

2. **Click your picture/initials** (top right corner)

3. **Click the picture again** or **"Change picture"**

4. **Choose an option**:
   - **Upload picture** - Select an image from your computer
   - **Take picture** - Use webcam to take a new picture

5. **Adjust the framing** (if necessary)

6. **Click "Save"**

### Picture tips:

- Use a professional photo
- Neutral background is preferred
- Face centered and clearly visible
- Good lighting
        `,
                category: 'teams',
                keywords: ['teams', 'picture', 'profile', 'avatar', 'image']
            }
        ]
    }
];
