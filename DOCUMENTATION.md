# DPDP Awareness & Training Simulation Platform

## Comprehensive Documentation

---

## 1. Project Overview

### 1.1 Purpose
The **DPDP Awareness & Training Simulation Platform** is a web-based compliance training application aligned with India's **Digital Personal Data Protection (DPDP) Act, 2023**. It is designed as an AICA Level 2 Capstone project to educate employees, compliance officers, and administrators about data privacy obligations under the Act.

### 1.2 Key Objectives
- Deliver structured training modules mapped to DPDP Act chapters
- Provide interactive decision-tree scenarios for practical learning
- Assess knowledge through MCQ-based assessments with automatic grading
- Issue compliance certificates upon successful assessment completion
- Enable role-based access for administrators, compliance officers, and employees
- Maintain audit trails for all administrative and training activities

### 1.3 Live URL
- **Published App**: https://dpdp-comply.lovable.app

---

## 2. Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | React 18 with TypeScript |
| **Build Tool** | Vite |
| **Styling** | Tailwind CSS + shadcn/ui component library |
| **Routing** | React Router DOM v6 |
| **State Management** | TanStack React Query (server state) |
| **Backend / Database** | Lovable Cloud (Supabase/PostgreSQL) |
| **Authentication** | Lovable Cloud Auth (email/password) |
| **Deployment** | Lovable Cloud hosting |

---

## 3. Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend (React)               │
│  ┌───────────┐ ┌──────────┐ ┌────────────────┐  │
│  │   Pages   │ │Components│ │   UI Library   │  │
│  │ (Routes)  │ │ (Logic)  │ │  (shadcn/ui)   │  │
│  └─────┬─────┘ └────┬─────┘ └────────────────┘  │
│        │             │                            │
│  ┌─────▼─────────────▼─────┐                     │
│  │   Auth Context Provider  │                     │
│  │   + React Query Client   │                     │
│  └───────────┬──────────────┘                     │
└──────────────┼──────────────────────────────────┘
               │ HTTPS / REST API
┌──────────────▼──────────────────────────────────┐
│            Lovable Cloud Backend                 │
│  ┌────────────┐ ┌─────────┐ ┌───────────────┐   │
│  │ PostgreSQL │ │  Auth   │ │ Row-Level      │   │
│  │  Database  │ │ Service │ │ Security (RLS) │   │
│  └────────────┘ └─────────┘ └───────────────┘   │
└─────────────────────────────────────────────────┘
```

### 3.2 Folder Structure

```
src/
├── components/
│   ├── ui/                    # shadcn/ui reusable components
│   ├── AdminAssessmentForm.tsx # CRUD form for assessments & questions
│   ├── AdminModuleForm.tsx     # CRUD form for training modules
│   ├── AdminScenarioForm.tsx   # CRUD form for scenarios & nodes
│   ├── AppSidebar.tsx          # Navigation sidebar with role-based menus
│   ├── AssessmentQuiz.tsx      # MCQ quiz engine with timer & scoring
│   ├── DashboardLayout.tsx     # Authenticated layout wrapper
│   ├── ModuleViewer.tsx        # Markdown module content viewer
│   ├── NavLink.tsx             # Navigation link component
│   └── ScenarioPlayer.tsx      # Interactive decision-tree player
├── hooks/
│   ├── use-mobile.tsx          # Responsive breakpoint hook
│   └── use-toast.ts            # Toast notification hook
├── integrations/
│   └── supabase/
│       ├── client.ts           # Auto-generated Supabase client
│       └── types.ts            # Auto-generated database types
├── lib/
│   ├── auth.tsx                # Authentication context & provider
│   └── utils.ts                # Utility functions (cn helper)
├── pages/
│   ├── Index.tsx               # Landing page
│   ├── Auth.tsx                # Login / Sign-up page
│   ├── Dashboard.tsx           # User dashboard with progress overview
│   ├── Modules.tsx             # Training modules listing & management
│   ├── Scenarios.tsx           # Interactive scenarios listing & management
│   ├── Assessments.tsx         # Assessments listing & quiz launcher
│   ├── Certificates.tsx        # Certificate viewer & download
│   ├── Reports.tsx             # Analytics & compliance reports
│   ├── UsersAdmin.tsx          # User & role management (admin only)
│   └── NotFound.tsx            # 404 page
├── App.tsx                     # Root component with routing
├── main.tsx                    # Application entry point
└── index.css                   # Global styles & design tokens
```

---

## 4. Database Schema

### 4.1 Entity-Relationship Overview

```
training_modules (1) ──── (N) assessments
training_modules (1) ──── (N) scenarios
training_modules (1) ──── (N) module_progress
training_modules (1) ──── (N) certificates
assessments      (1) ──── (N) questions
assessments      (1) ──── (N) attempts
scenarios        (1) ──── (N) scenario_nodes
scenario_nodes   (1) ──── (N) scenario_nodes (self-referencing tree)
attempts         (1) ──── (N) certificates
```

### 4.2 Table Descriptions

#### `training_modules`
Stores the seven DPDP Act training modules.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated unique ID |
| title | TEXT | Module title |
| description | TEXT | Brief module description |
| content | TEXT | Markdown-formatted module content |
| dpdp_section | TEXT | Mapped DPDP Act section/chapter |
| duration_minutes | INTEGER | Estimated completion time (default: 30) |
| is_mandatory | BOOLEAN | Whether module is required (default: true) |
| objectives | TEXT[] | Array of learning objectives |
| version | TEXT | Content version (default: '1.0') |
| created_by | UUID | Author's user ID |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### `assessments`
MCQ-based tests linked to training modules.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated unique ID |
| title | TEXT | Assessment title |
| module_id | UUID (FK) | Associated training module |
| question_count | INTEGER | Number of questions (default: 10) |
| pass_threshold | INTEGER | Minimum pass percentage (default: 70) |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### `questions`
Question bank for assessments.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated unique ID |
| assessment_id | UUID (FK) | Parent assessment |
| question_text | TEXT | The question |
| options | JSONB | Array of answer options |
| correct_option | INTEGER | Index of correct answer (0-based) |
| explanation | TEXT | Explanation shown after answering |
| sort_order | INTEGER | Display order |

#### `attempts`
Records each user's assessment attempt.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated unique ID |
| user_id | UUID | User who took the assessment |
| assessment_id | UUID (FK) | Assessment taken |
| score | INTEGER | Number of correct answers |
| total_questions | INTEGER | Total questions in attempt |
| passed | BOOLEAN | Whether user met pass threshold |
| answers | JSONB | Detailed answer record |
| completed_at | TIMESTAMPTZ | Completion timestamp |

#### `scenarios`
Interactive decision-tree scenarios.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated unique ID |
| title | TEXT | Scenario title |
| description | TEXT | Scenario description |
| module_id | UUID (FK) | Associated training module |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### `scenario_nodes`
Individual nodes in a scenario's decision tree.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated unique ID |
| scenario_id | UUID (FK) | Parent scenario |
| parent_node_id | UUID (FK, self) | Parent node (null for root) |
| node_text | TEXT | Node content / question |
| is_root | BOOLEAN | Whether this is the starting node |
| is_compliant | BOOLEAN | Whether choice is DPDP-compliant |
| explanation | TEXT | Feedback for this choice |
| sort_order | INTEGER | Display order among siblings |

#### `module_progress`
Tracks user progress through training modules.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated unique ID |
| user_id | UUID | Learner's user ID |
| module_id | UUID (FK) | Training module |
| status | TEXT | 'not_started', 'in_progress', 'completed' |
| progress_percent | INTEGER | Completion percentage (0-100) |
| last_section | TEXT | Bookmark for resume functionality |
| started_at | TIMESTAMPTZ | When user started the module |
| completed_at | TIMESTAMPTZ | When user finished the module |
| updated_at | TIMESTAMPTZ | Last progress update |

#### `certificates`
Issued upon passing an assessment.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated unique ID |
| user_id | UUID | Certificate holder |
| module_id | UUID (FK) | Associated training module |
| attempt_id | UUID (FK) | Qualifying assessment attempt |
| certificate_number | TEXT | Unique certificate identifier |
| issued_at | TIMESTAMPTZ | Issue date |
| valid_until | TIMESTAMPTZ | Expiry date (default: 1 year) |

#### `profiles`
Extended user profile information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated unique ID |
| user_id | UUID | Auth user reference |
| full_name | TEXT | Display name |
| department | ENUM | hr, it, finance, marketing, operations |
| avatar_url | TEXT | Profile picture URL |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

#### `user_roles`
Role assignments for RBAC.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated unique ID |
| user_id | UUID | Auth user reference |
| role | ENUM | admin, compliance_officer, employee |

#### `audit_logs`
Tracks administrative and system actions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated unique ID |
| user_id | UUID | Acting user |
| action | TEXT | Action performed |
| entity_type | TEXT | Type of entity affected |
| entity_id | UUID | ID of entity affected |
| details | JSONB | Additional context |
| ip_address | TEXT | Client IP address |
| created_at | TIMESTAMPTZ | Action timestamp |

---

## 5. Authentication & Authorization

### 5.1 Authentication
- **Method**: Email and password authentication via Lovable Cloud Auth
- **Session**: JWT-based with automatic token refresh
- **Persistence**: Sessions stored in localStorage

### 5.2 Role-Based Access Control (RBAC)

| Role | Capabilities |
|------|-------------|
| **Admin** | Full platform access: manage modules, scenarios, assessments, users, roles, departments. View all reports, audit logs, and certificates. |
| **Compliance Officer** | Content management: create/edit modules, scenarios, assessments. View all reports and certificates. |
| **Employee** | Training consumption: view modules, play scenarios, take assessments, view own certificates and progress. |

### 5.3 Default Role
All new users are automatically assigned the **employee** role upon registration.

### 5.4 Row-Level Security (RLS)
Every table has RLS enabled with policies ensuring:
- Employees can only read/write their own data (attempts, progress, certificates)
- Admins and Compliance Officers have elevated read/write access for content management
- Public content (modules, scenarios, assessments, questions) is readable by all authenticated users
- Audit logs are readable only by admins
- User role management is restricted to admins

---

## 6. Feature Details

### 6.1 Landing Page (`/`)
- Public-facing page introducing the platform
- Call-to-action to sign up or log in
- Overview of DPDP Act training objectives

### 6.2 Authentication (`/auth`)
- Login and Sign-up forms with email/password
- Email verification required before first login
- Redirects to dashboard upon successful authentication

### 6.3 Dashboard (`/dashboard`)
- Overview of user's training progress
- Module completion statistics
- Recent activity and pending assessments
- Quick links to continue training

### 6.4 Training Modules (`/modules`)
- **Employees**: Browse and study Markdown-formatted training content with progress tracking, bookmarking, and resume capability
- **Admins/COs**: CRUD interface to create, edit, and manage modules with DPDP section mapping, versioning, and learning objectives

### 6.5 Interactive Scenarios (`/scenarios`)
- **Employees**: Play through decision-tree scenarios that simulate real-world data protection situations with immediate compliance feedback
- **Admins/COs**: Build and manage scenario decision trees with compliant/non-compliant paths and explanatory feedback

### 6.6 Assessments (`/assessments`)
- **Employees**: Take MCQ-based assessments with:
  - Randomized question selection from the question bank
  - Timed assessment sessions
  - Immediate feedback on each answer with explanations
  - Score calculation and pass/fail determination
  - Answer review screen after completion
  - Retake capability for failed attempts
- **Admins/COs**: Create and manage assessments with configurable pass thresholds and question banks

### 6.7 Certificates (`/certificates`)
- Automatically issued upon passing an assessment
- Contains unique certificate number, issue date, and validity period (1 year)
- Viewable and downloadable by the certificate holder
- Admins/COs can view all issued certificates

### 6.8 Reports (`/reports`)
- Training completion analytics
- Assessment performance statistics
- Department-wise compliance tracking
- Available to Admins and Compliance Officers

### 6.9 User Management (`/users`)
- Admin-only interface
- Assign roles (admin, compliance_officer, employee)
- Assign departments (HR, IT, Finance, Marketing, Operations)
- View all registered users and their roles

---

## 7. DPDP Act 2023 Alignment

The platform's curriculum is structured around seven modules mapped to the Act's key chapters:

| Module | DPDP Act Section | Topic |
|--------|-----------------|-------|
| 1 | Chapter I | Preliminary Definitions & Scope |
| 2 | Chapter II | Data Principal Rights |
| 3 | Chapter III | Obligations of Data Fiduciaries |
| 4 | Chapter IV | Special Provisions (Children's Data, Significant Data Fiduciaries) |
| 5 | Chapter V | Data Protection Board of India |
| 6 | Chapter VI | Penalties & Compliance |
| 7 | Chapter VII | Miscellaneous Provisions |

### 7.1 Data Minimization
The platform itself adheres to DPDP principles by collecting only essential user data (name, email, department) required for training delivery and compliance tracking.

---

## 8. Security Measures

| Measure | Implementation |
|---------|---------------|
| **Authentication** | JWT-based with automatic token refresh |
| **Authorization** | Row-Level Security (RLS) on all database tables |
| **Role Enforcement** | Database-level `has_role()` function for policy checks |
| **Audit Logging** | All admin actions, assessment attempts, and certificate issuances logged |
| **Data Isolation** | Users can only access their own training data |
| **Session Management** | Secure session persistence with automatic expiry |

---

## 9. API & Data Access Patterns

All data access uses the Supabase JavaScript client with RLS enforcement:

```typescript
import { supabase } from "@/integrations/supabase/client";

// Example: Fetch modules (RLS ensures only authenticated users see data)
const { data, error } = await supabase
  .from("training_modules")
  .select("*")
  .order("created_at");

// Example: Insert an attempt (RLS ensures user_id matches auth.uid())
const { error } = await supabase
  .from("attempts")
  .insert({ user_id, assessment_id, score, total_questions, passed, answers });
```

---

## 10. Deployment

### 10.1 Hosting
The application is deployed on **Lovable Cloud** with:
- Automatic frontend builds and deployment
- Managed PostgreSQL database
- Built-in authentication service
- Edge-ready CDN delivery

### 10.2 Environment Variables
Automatically managed by Lovable Cloud:
- `VITE_SUPABASE_URL` – Backend API endpoint
- `VITE_SUPABASE_PUBLISHABLE_KEY` – Public API key for client-side access

### 10.3 Published URL
- https://dpdp-comply.lovable.app

---

## 11. Getting Started (Local Development)

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## 12. User Guide

### 12.1 For Employees
1. **Sign Up** at `/auth` with your email and password
2. **Verify** your email via the confirmation link
3. **Log In** and access the **Dashboard**
4. **Study Modules** – Read through each training module; progress is saved automatically
5. **Play Scenarios** – Practice decision-making with interactive scenarios
6. **Take Assessments** – Complete MCQ tests; score ≥ pass threshold to earn a certificate
7. **View Certificates** – Download your compliance certificates from the Certificates page

### 12.2 For Admins / Compliance Officers
1. **Manage Modules** – Create, edit, and version training content with Markdown
2. **Build Scenarios** – Design decision-tree paths with compliant/non-compliant outcomes
3. **Create Assessments** – Add questions with options, correct answers, and explanations
4. **Manage Users** – Assign roles and departments (Admin only)
5. **View Reports** – Monitor training progress and compliance metrics

---

*Document Version: 1.0*
*Last Updated: February 2026*
*Platform: DPDP Awareness & Training Simulation Platform*
*Aligned with: Digital Personal Data Protection Act, 2023 (India)*
