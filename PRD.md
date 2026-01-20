Product Requirements Document (PRD)
SmartLIB-JAIN: College Library Management System

1. Document Information
Product Name: SmartLIB-JAIN
Version: 1.0
Date: January 16, 2026
Document Owner: Product Management & Architecture Team
Status: Draft for Review

2. Executive Summary
SmartLIB-JAIN is a comprehensive library management system designed specifically for college libraries. The application provides end-to-end functionality for managing library seats, book circulation, user registrations, and administrative workflows. Built as a modern single-page application, SmartLIB-JAIN delivers a seamless user experience for both students and library administrators while maintaining robust security and data integrity through role-based access control.

3. Product Vision & Objectives
3.1 Vision Statement
To provide college libraries with a modern, efficient, and user-friendly digital platform that simplifies seat booking, book circulation, and user management while enhancing the overall library experience for students and staff.
3.2 Business Objectives

Digitize and streamline library operations to reduce manual administrative overhead
Improve resource utilization through real-time seat and book availability tracking
Enhance user experience with self-service capabilities for students
Provide comprehensive reporting and analytics for library administrators
Support multilingual operations to serve diverse student populations

3.3 Success Metrics

Reduction in manual processing time for loan requests by 70%
90% user adoption rate among registered students within first semester
Average seat utilization rate increase of 25%
Administrative approval processing time reduced to under 2 minutes per request
Email notification delivery rate of 98% or higher


4. Technical Architecture Overview
4.1 Technology Stack
Frontend:

React 18+ with TypeScript for type safety and maintainability
CSS3 and Bootstrap 5.x for responsive styling and UI components
Vite as build tool and development server

Backend & Infrastructure:

Supabase as Backend-as-a-Service platform
PostgreSQL database via Supabase Database
Supabase Authentication for user management and role-based access
Supabase Storage for optional asset management
Row Level Security (RLS) policies for data protection

Third-Party Integrations:

EmailJS for transactional email notifications

Application Architecture:

Single-Page Application (SPA) pattern
Tab-based navigation system
Client-side routing without page reloads
State management for user session and application data

4.2 Architectural Principles

Role-based access control enforced at both application and database levels
Real-time data synchronization using Supabase subscriptions where applicable
Optimistic UI updates with server-side validation
Responsive design supporting desktop and tablet form factors
Progressive enhancement for core functionality
Separation of concerns between view logic and business logic


5. User Roles & Permissions
5.1 Student Role
Access Level: Standard User
Permissions:

View personal dashboard with statistics and active items
Search and browse book catalog
Submit book loan requests
Reserve books for future dates
Book library seats with time limits
View and manage personal reservations
View reading history and account details
Update profile information (limited fields)
Receive email notifications for library activities

Restrictions:

Cannot access administrative functions
Cannot modify system settings
Cannot view other users' data
Cannot override approval workflows

5.2 Librarian / Admin Role
Access Level: Administrative User
Permissions:

All student permissions plus administrative capabilities
Manage book inventory (add, edit, delete, search)
Process loan requests (approve, reject)
Manage active loans and process returns
Calculate and manage fines
View and manage all user registrations
Approve or reject student account applications
Edit student records and change account status
Configure system-wide settings (auto-approve toggles)
Manage seat layouts and maintenance modes
Reset floor plans and seat allocations
Send bulk email notifications
View comprehensive reports and analytics
Access all system data across users

Restrictions:

Cannot delete system configuration tables
Cannot bypass audit logging for critical actions


6. Detailed Feature Requirements
6.1 Authentication & Authorization
6.1.1 User Registration (Student)
Purpose: Allow new students to create accounts and request library access.
Functional Requirements:

Registration form shall collect:

Full name
Email address (college domain validation recommended)
Password (minimum 8 characters with complexity requirements)
Student ID number
Department/Program
Academic year
Phone number (optional)


Password field shall include show/hide toggle
Form validation shall occur on both client and server sides
Upon successful submission, user account shall be created with "Pending" status
Confirmation message shall inform user that account requires admin approval
User credentials shall be stored securely using Supabase Auth
Duplicate email addresses shall be prevented

User Experience Requirements:

Clear error messages for validation failures
Loading indicator during submission
Automatic redirect to login after successful registration
Accessible form labels and ARIA attributes

6.1.2 User Login
Purpose: Authenticate users and establish role-based sessions.
Functional Requirements:

Login form shall accept email and password
Authentication shall be handled via Supabase Auth
Upon successful login, system shall:

Verify account status (Pending/Active/Suspended)
Load user role (Student/Admin)
Redirect to appropriate dashboard based on role
Initialize user session with secure token


Failed login attempts shall display generic error message for security
"Forgot Password" link shall trigger password reset flow via email
"Remember Me" option shall extend session duration
Pending accounts shall receive message to wait for approval
Suspended accounts shall be denied access with appropriate message

Security Requirements:

Session tokens shall expire after configurable timeout
Password shall never be displayed or logged
Rate limiting shall prevent brute force attacks
Secure HTTPS connection required for authentication

6.1.3 User Interface Preferences
Purpose: Allow users to customize their viewing experience.
Functional Requirements:

Dark Mode Toggle:

Shall persist selection in browser local storage
Shall apply theme across all application views
Shall provide smooth visual transition between modes
Default shall be light mode for new users


Language Selector:

Shall support three languages: English (en), Hindi (hi), Kannada (kn)
Shall persist selection in browser local storage
Shall apply translations to all UI text elements
Default shall be English for new users
Language changes shall take effect immediately without page reload



User Experience Requirements:

Toggle controls shall be accessible from all views
Visual indicator shall show current theme and language
Controls shall be placed in consistent location (header/navigation bar)


6.2 Student Dashboard
6.2.1 Dashboard Overview
Purpose: Provide students with at-a-glance summary of their library activities and quick access to key features.
Functional Requirements:

Dashboard shall display four primary statistics cards:

Active Loans: Count of currently borrowed books
Outstanding Fines: Total amount owed in local currency
Active Reservations: Count of books reserved for future dates
Seat Bookings: Current seat booking status and time remaining


Each statistics card shall:

Display numeric value prominently
Include descriptive label
Link to relevant detailed view when clicked
Show loading state while data is being fetched
Update automatically when underlying data changes



6.2.2 My Requests Section
Purpose: Display status of pending and recent loan requests.
Functional Requirements:

Shall display table of loan requests with columns:

Request Date
Book Title
Author
Status (Pending/Approved/Rejected/Cancelled)
Action buttons (Cancel for pending requests)


Shall show most recent 10 requests by default
"View All" link shall navigate to full requests history
Pending requests shall include cancel button
Approved requests shall show estimated pickup date
Rejected requests shall include reason if provided
Empty state message when no requests exist

6.2.3 My Loans Section
Purpose: Display currently borrowed books and their due dates.
Functional Requirements:

Shall display table of active loans with columns:

Book Title
Author
Issue Date
Due Date
Days Remaining (color-coded: green >7 days, yellow 3-7 days, red <3 days)
Fine Amount (if overdue)


Overdue items shall be highlighted with warning color
Shall calculate and display total fines owed
"Pay Fines" button shall be visible when fines exist
Empty state message when no active loans

6.2.4 My Reservations Section
Purpose: Display upcoming book reservations.
Functional Requirements:

Shall display table of reservations with columns:

Book Title
Reserved From Date
Reserved To Date
Status (Confirmed/Pending/Expired)
Cancel button


Shall allow cancellation of future reservations
Expired reservations shall be displayed differently or moved to history
Empty state message when no reservations

6.2.5 Quick Navigation
Purpose: Provide shortcuts to frequently used features.
Functional Requirements:

"Browse Catalog" button shall navigate to book search view
"Book a Seat" button shall navigate to seat map view
Buttons shall be prominently displayed on dashboard
Disabled states when services are unavailable


6.3 Catalog / Search
6.3.1 Book Search
Purpose: Enable students to discover and search for books in library collection.
Functional Requirements:

Search bar shall support:

Title search
Author search
ISBN search
Category/genre search
Keyword search across multiple fields


Search shall be case-insensitive
Partial matching shall be supported
Search results shall display as cards or list items showing:

Book cover thumbnail (if available)
Title
Author(s)
Publication year
Category/genre
Availability status (Available/Issued/Reserved)
Total copies and available copies count


Pagination or infinite scroll for large result sets
Filter options:

By category
By availability status
By publication year range


Sort options:

Relevance (default for search)
Title (A-Z, Z-A)
Author name
Publication year (newest first, oldest first)



6.3.2 Book Details View
Purpose: Display comprehensive information about selected book.
Functional Requirements:

Detailed view shall display:

Large cover image
Title and subtitle
Author(s)
ISBN
Publisher
Publication date
Edition
Category/genre
Description/synopsis
Physical details (pages, dimensions)
Location code in library
Total copies in collection
Available copies count
Current availability status


Action buttons based on availability:

"Request Book" when copies available
"Reserve Book" when all copies currently issued
"View Availability Calendar" for planning


Display list of current holders (for admin only)
Show expected return dates if all copies issued

6.3.3 Book Request Functionality
Purpose: Allow students to request books for borrowing.
Functional Requirements:

"Request Book" button shall open request modal
Modal shall display:

Book title and cover
Confirmation message
Expected processing time (if auto-approve disabled)
Pickup instructions


Upon submission:

Request record created in loan_requests table
Request status set to "Pending" if auto-approve disabled
Request auto-approved and loan created if auto-approve enabled
Student receives confirmation message
Email notification sent to student
Admin receives notification (if manual approval required)


Validation checks:

Student must have Active account status
Student must not have unpaid fines exceeding threshold
Student must not exceed maximum loan limit
Book must have available copies
Student must not already have this book on loan or requested



6.3.4 Book Reservation System
Purpose: Allow students to reserve books for specific future dates when currently unavailable.
Functional Requirements:

"Reserve Book" button shall open availability calendar modal
Calendar shall display:

Current month view with navigation
Days when book will be available (based on expected returns)
Days when book is already reserved by others (blocked)
Today's date highlighted


User shall select:

Start date (must be future date)
End date (must be after start date)
Maximum reservation period enforced (configurable, default 14 days)


Upon confirmation:

Reservation record created in reservations table
Student receives confirmation email
Calendar updated to reflect new reservation


Validation checks:

Dates must not overlap with existing reservations
Reservation period must comply with library policy
Student must not exceed maximum concurrent reservations



6.3.5 Reservation Management
Purpose: Allow students to manage their existing reservations.
Functional Requirements:

Students can view all reservations in My Reservations section
Cancel button available for future reservations
Cancellation shall:

Remove reservation from reservations table
Send cancellation confirmation email
Update availability calendar
Allow other students to reserve those dates


Expired reservations automatically marked as "Expired"
Notification sent 24 hours before reservation start date


6.4 Seats / Floor Map
6.4.1 Seat Map Display
Purpose: Provide visual representation of library seating and enable seat booking.
Functional Requirements:

Floor map shall display:

Visual grid or floor plan layout
Multiple zones/sections (e.g., Reading Area, Study Rooms, Computer Lab)
Individual seats with unique identifiers
Seat status indicators:

Available (green)
Occupied (red)
Reserved by current user (blue)
Under maintenance (gray)




Interactive elements:

Click on available seat to book
Hover to see seat details (number, zone, features)
Current user's booked seat highlighted prominently


Zone filtering:

Dropdown to filter by specific zone
"Show All" option to view entire floor


Refresh button to update seat availability in real-time

6.4.2 Seat Booking Process
Purpose: Enable students to reserve library seats for study sessions.
Functional Requirements:

When student clicks available seat:

Booking confirmation modal appears
Displays seat number and zone
Shows booking duration options (1 hour, 2 hours, 4 hours, full day)
Terms and conditions checkbox


Upon confirmation:

Seat status updated to "Occupied" in database
Booking record created with:

Student ID
Seat ID
Start time (current timestamp)
Expected end time (start + duration)


Seat immediately marked as occupied on map
Student dashboard updated with booking details


Restrictions:

Student can book only one seat at a time
Must release current seat before booking another
Maximum booking duration per policy (e.g., 8 hours)



6.4.3 Seat Release & Auto-Expiry
Purpose: Ensure seats are returned to availability pool and prevent indefinite blocking.
Functional Requirements:

Manual Release:

"Release Seat" button visible on booked seat
Confirmation prompt before release
Immediate update of seat status to "Available"
Booking record marked as completed


Auto-Expiry:

Background process checks for expired bookings every 5 minutes
Seats past expected end time automatically released
Status updated to "Available"
Student notified via dashboard notification


Grace Period:

Optional 15-minute grace period before auto-expiry
Warning notification sent 10 minutes before expiry



6.4.4 Admin Seat Management
Purpose: Allow administrators to manage seat layouts and perform maintenance.
Functional Requirements:

Maintenance Mode Toggle:

Admin can mark individual seats as "Under Maintenance"
Maintenance seats removed from student booking view
Maintenance status persists until manually cleared
Option to add maintenance notes (visible to admins only)


Reset Floor Function:

"Reset All Seats" button available to admin
Confirmation prompt with warning message
Action shall:

Release all occupied seats
Clear all active bookings
Send notification to affected students
Log action in audit trail




Seat Configuration:

Admin can add or remove seats from layout
Define seat properties (zone, features, capacity)
Reorder seat display




6.5 Account / Profile
6.5.1 Personal Information Display
Purpose: Allow students to view and manage their account details.
Functional Requirements:

Profile view shall display:

Full name
Email address
Student ID
Phone number
Department/Program
Academic year
Account status (Active/Pending/Suspended)
Registration date
Profile photo (optional)


Editable fields:

Phone number
Profile photo
Preferred contact method


Read-only fields:

Name (requires admin approval to change)
Email (requires verification to change)
Student ID
Department



6.5.2 Academic Information
Purpose: Display education-related details relevant to library services.
Functional Requirements:

Academic section shall show:

Current program (e.g., B.Tech Computer Science)
Year of study
Expected graduation date
Faculty advisor (if applicable)
Specialization/minor



6.5.3 Reading History Summary
Purpose: Provide students with overview of their library usage patterns.
Functional Requirements:

Reading statistics shall display:

Total books borrowed (lifetime)
Books borrowed this semester
Books borrowed this year
Favorite categories (top 3 based on borrowing history)
Average reading duration
Total late returns


Recent Reading History:

List of last 10 borrowed books
Each entry shows: title, author, issue date, return date
"View Full History" link to complete list


Privacy controls:

Option to clear reading history (anonymize past records)
Toggle to make reading stats private/public



6.5.4 Account Security
Purpose: Enable students to manage account security settings.
Functional Requirements:

Change Password functionality:

Current password verification required
New password with strength indicator
Confirmation field
Password requirements displayed


Active Sessions:

List of current login sessions with device info
Option to log out other sessions


Notification Preferences:

Email notification toggles for:

Due date reminders
Reservation confirmations
Fine notifications
New arrivals in favorite categories






6.6 Admin – Inventory Management
6.6.1 Book Catalog Administration
Purpose: Enable administrators to manage the complete library book collection.
Functional Requirements:

Admin book list view shall display:

Searchable and sortable table of all books
Columns: Cover, Title, Author, ISBN, Category, Total Copies, Available Copies, Status
Pagination controls
"Add New Book" button prominently displayed


Search and Filter:

Search by title, author, ISBN, category
Filter by availability status
Filter by category/genre
Filter by acquisition date range



6.6.2 Add New Book
Purpose: Allow administrators to add new titles to library collection.
Functional Requirements:

"Add Book" modal shall contain form fields:

Title (required)
Subtitle (optional)
Author(s) (required, support multiple authors)
ISBN (required, validated format)
Publisher (optional)
Publication date
Edition
Category/genre (dropdown)
Description/synopsis (textarea)
Number of copies (required, default 1)
Location code
Cover image URL or file upload
Acquisition date (defaults to today)
Acquisition cost (optional)


Validation:

Duplicate ISBN check with warning
Required field validation
ISBN format validation


Upon successful submission:

Book record created in books table
Confirmation message displayed
Book list refreshed to show new entry



6.6.3 Edit Book Details
Purpose: Allow administrators to modify existing book information.
Functional Requirements:

Edit button on each book row opens edit modal
Modal pre-populated with current book data
All fields editable except:

ISBN (read-only after creation to prevent data inconsistency)
Number of copies currently on loan (calculated field)


Special handling for copy count:

Can increase total copies (new copies added)
Can decrease total copies only if sufficient copies available
Warning displayed if attempting to reduce below issued count


Upon save:

Updated record saved to database
Audit log entry created
Book list refreshed



6.6.4 Delete Book
Purpose: Allow administrators to remove books from catalog.
Functional Requirements:

Delete button available on book rows
Confirmation modal with warnings:

"Are you sure you want to delete this book?"
Warning if book has active loans (deletion blocked)
Warning if book has pending requests (requests will be cancelled)
Warning if book has future reservations (reservations will be cancelled)


Deletion process:

Soft delete preferred (mark as deleted, retain historical data)
If hard delete, cascade to related records appropriately
Cannot delete if active loans exist
Pending requests and future reservations cancelled with notifications sent


Audit logging:

Record deletion timestamp
Record admin user who performed deletion
Retain deletion reason if provided



6.6.5 System Settings Configuration
Purpose: Enable administrators to configure automated workflows.
Functional Requirements:

Settings panel shall include toggle switches for:
Auto-Approve Student Registration:

When enabled: New student registrations automatically set to "Active" status
When disabled: Registrations remain "Pending" until manual admin approval
Default state: Disabled

Auto-Approve Loan Requests:

When enabled: Book requests automatically approved and loans created if all conditions met
When disabled: Requests remain "Pending" until manual admin review
Default state: Disabled


Settings shall:

Display current state clearly
Save immediately upon toggle
Persist across admin sessions
Be stored in system_settings table


Configuration panel may also include:

Maximum loan duration (days)
Maximum concurrent loans per student
Fine amount per day for overdue books
Maximum reservation period (days)
Seat booking maximum duration (hours)



6.6.6 Book Acquisition Requests
Purpose: View and manage requests from students for library to acquire new books.
Functional Requirements:

List of student-submitted acquisition requests showing:

Student name
Requested book title and author
Request date
Justification/reason
Number of upvotes from other students
Status (Pending/Approved/Rejected/Acquired)


Admin actions:

Approve request (adds to acquisition list)
Reject with reason
Mark as acquired (optionally creates book record)


Status tracking throughout acquisition process


6.7 Admin – Circulation
6.7.1 Loan Request Management
Purpose: Enable administrators to review and process pending loan requests.
Functional Requirements:

Pending requests view shall display table with:

Request ID
Request date and time
Student name and ID
Book title and author
Student's current active loans count
Student's fine balance
Priority indicator (if applicable)
Action buttons (Approve/Reject)


Sorting and filtering:

Sort by request date (oldest first default)
Filter by student
Filter by book


Approve Process:

Click Approve button
Confirmation modal displays:

Student details
Book details
Expected due date (calculated)
Option to modify due date


Upon confirmation:

Request status updated to "Approved"
Active loan record created in active_loans table
Book available count decremented
Student notified via email with pickup instructions
Loan slip generated (printable)




Reject Process:

Click Reject button
Modal prompts for rejection reason (required)
Upon confirmation:

Request status updated to "Rejected"
Rejection reason stored
Student notified via email with reason
Book available count unchanged





6.7.2 Active Loans Management
Purpose: Display and manage all currently issued books.
Functional Requirements:

Active loans table shall display:

Loan ID
Student name and ID (clickable to view profile)
Book title and author
Issue date
Due date
Days overdue (if applicable, highlighted)
Fine amount (if overdue)
Action buttons (Process Return, Send Reminder, Extend Due Date)


Color coding:

Green: On-time loans
Yellow: Due within 3 days
Red: Overdue loans


Filtering and search:

Filter by overdue status
Search by student name or ID
Search by book title
Sort by due date, issue date, student name



6.7.3 Return Processing
Purpose: Enable administrators to process book returns and update system accordingly.
Functional Requirements:

Process Return action:

Click "Process Return" on loan record
Modal displays:

Book condition assessment (Good/Fair/Damaged/Lost)
Return date (defaults to today, editable for backdating)
Fine calculation (auto-calculated for overdue)
Option to waive fine with reason
Notes field for damage or issues




Upon confirmation:

Loan record moved to reading_history table
Book available count incremented
Fine added to student account if applicable
Student notified via email (return confirmation and fine if applicable)
Book status updated to "Available"


Special handling:

If book reported lost: fine amount set to book replacement cost
If book damaged: additional damage fine may apply
Fine waiver requires admin notes for audit trail



6.7.4 Fine Calculation & Management
Purpose: Automatically calculate and manage overdue fines.
Functional Requirements:

Fine calculation:

Automated calculation based on:

Number of days overdue
Fine rate per day (from system settings)
Maximum fine cap (if configured)


Calculation runs daily via scheduled job
Fine amount stored with loan record
Running total maintained on student account


Fine display:

Total fines shown on student dashboard
Breakdown by loan on loan details
Fine history viewable by student and admin


Fine adjustment:

Admin can waive fines fully or partially
Waiver requires justification note
Waiver logged in audit trail
Student notified of waiver


Payment tracking:

Manual entry of fine payment by admin
Payment date and amount recorded
Receipt number optional
Outstanding balance automatically updated



6.7.5 Email Notifications & Reminders
Purpose: Keep students informed about their loans and due dates via email.
Functional Requirements:

Automated email reminders:

Due date reminder: 3 days before due date
Due today notification: on due date
Overdue notice: 1 day after due date, then weekly


Manual email sending:

"Send Reminder" button on loan records
Bulk reminder option to send to all students with due items
Custom message option


Email content shall include:

Student name
Book title(s)
Due date(s)
Current fine amount (if any)
Return instructions
Library contact information


Email delivery:

Sent via EmailJS integration
Delivery status logged
Retry mechanism for failed sends
Error handling and admin notification for persistent failures




6.8 Admin – User Registry
6.8.1 Student List View
Purpose: Provide administrators with comprehensive view of all student accounts.
Functional Requirements:

Student registry table shall display:

Student ID
Full name
Email
Department
Academic year
Account status (Pending/Active/Suspended)
Registration date
Active loans count
Outstanding fines
Action buttons (Edit, Change Status)


Status indicators:

Pending: Yellow badge
Active: Green badge
Suspended: Red badge


Filtering options:

Filter by status
Filter by department
Filter by academic year
Filter by registration date range


Search functionality:

Search by name, email, or student ID
Real-time search results



6.8.2 Student Approval Process
Purpose: Enable administrators to review and approve/reject student registrations.
Functional Requirements:

Pending students highlighted in registry
Separate "Pending Approvals" view showing only Pending accounts
Each pending record displays:

All submitted registration information
Registration timestamp
Approve and Reject buttons


Approve process:

Click Approve button
Confirmation prompt
Upon confirmation:

Account status changed to "Active"
Student receives approval email with login instructions
Student can now access full system features




Reject process:

Click Reject button
Modal prompts for rejection reason
Upon confirmation:

Account status changed to "Rejected"
Student receives rejection email with reason
Account login disabled
Record retained in database for audit purposes





6.8.3 Edit Student Records
Purpose: Allow administrators to modify student account information.
Functional Requirements:

Edit button opens "Edit Student" modal
Modal displays form with all student fields:

Full name
Email (with warning about email change implications)
Student ID (read-only after creation)
Phone number
Department/Program
Academic year
Preferred contact method


Validation:

Email uniqueness check
Required field validation
Phone number format validation


Upon save:

Record updated in profiles table
User data in Supabase Auth updated if email changed
Student notified if contact information changed
Admin action logged



6.8.4 Change Student Status
Purpose: Enable administrators to activate, suspend, or reactivate student accounts.
Functional Requirements:

Status change dropdown on each student row
Available status transitions:

Pending → Active (approval)
Pending → Rejected
Active → Suspended
Suspended → Active


Suspend account:

Requires reason for suspension
Confirmation prompt
Upon confirmation:

Status updated to "Suspended"
Student cannot log in
Active sessions terminated
Existing loans remain active but no new requests accepted
Student notified via email




Reactivate suspended account:

Requires admin notes for reactivation
Confirmation prompt
Upon confirmation:

Status updated to "Active"
Login access restored
Student can resume all activities
Student notified via email




Status history:

All status changes logged with timestamp and admin user
Viewable in student detail view



6.8.5 Student Detail View
Purpose: Provide comprehensive view of individual student's library activities.
Functional Requirements:

Accessible by clicking student name in registry
Detail view shall display:
Account Information:

All profile fields
Account status history
Registration date
Last login timestamp

Current Activity:

Active loans table with due dates
Pending loan requests
Active seat bookings
Active reservations

History:

Complete borrowing history
Request history (approved, rejected, cancelled)
Fine payment history
Status change history

Statistics:

Total books borrowed
Current outstanding fines
Total fines paid
Average loan duration
Number of late returns

Administrative Actions:

Edit student details button
Change status dropdown
Send email button
Add notes section (admin only)




7. Data Model
7.1 Database Schema Overview
The application utilizes Supabase PostgreSQL database with the following core tables. All tables shall include standar
7.2 Table Specifications
7.2.1 users (Public Index Table)
Purpose: Publicly accessible user index for basic identification and searching.
Fields:

id (UUID, Primary Key, references Supabase Auth user)
email (VARCHAR, Unique, Indexed)
full_name (VARCHAR)
role (ENUM: 'student', 'admin')
status (ENUM: 'pending', 'active', 'suspended', 'rejected')
created_at (TIMESTAMP)
updated_at (TIMESTAMP)

Access Control:

Public read access for basic user lookups
Insert/update restricted to authenticated users for their own record
Admin has full access

7.2.2 profiles (Private Student Data)
Purpose: Store detailed student information with privacy protection.
Fields:

id (UUID, Primary Key, Foreign Key to users.id)
student_id (VARCHAR, Unique, Indexed)
phone_number (VARCHAR)
department (VARCHAR)
program (VARCHAR)
academic_year (VARCHAR)
expected_graduation (DATE)
profile_photo_url (VARCHAR)
preferred_contact (ENUM: 'email', 'phone')
total_books_borrowed (INTEGER, Default 0)
total_fines_paid (DECIMAL)
reading_history_private (BOOLEAN, Default false)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)

Access Control:

Read/write access for profile owner
Admin has full access
Other users cannot access

7.2.3 books
Purpose: Store library book catalog information.
Fields:

id (UUID, Primary Key)
isbn (VARCHAR, Unique, Indexed)
title (VARCHAR, Indexed)
subtitle (VARCHAR)
authors (JSONB, array of author names)
publisher (VARCHAR)
publication_date (DATE)
edition (VARCHAR)
category (VARCHAR, Indexed)
description (TEXT)
total_copies (INTEGER)
available_copies (INTEGER)
location_code (VARCHAR)
cover_image_url (VARCHAR)
acquisition_date (DATE)
acquisition_cost (DECIMAL)
is_deleted (BOOLEAN, Default false)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)

Access Control:

Public read access for all users
Insert/update/delete restricted to admin

7.2.4 loan_requests
Purpose: Track student requests to borrow books.
Fields:

id (UUID, Primary Key)
student_id (UUID, Foreign Key to users.id, Indexed)
book_id (UUID, Foreign Key to books.id, Indexed)
request_date (TIMESTAMP)
status (ENUM: 'pending', 'approved', 'rejected', 'cancelled')
approved_by (UUID, Foreign Key to users.id, nullable)
approved_date (TIMESTAMP, nullable)
rejection_reason (TEXT, nullable)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)

Access Control:

Students can read their own requests and create new requests
Admin has full access

7.2.5 active_loans
Purpose: Track currently issued books.
Fields:

id (UUID, Primary Key)
request_id (UUID, Foreign Key to loan_requests.id)
student_id (UUID, Foreign Key to users.id, Indexed)
book_id (UUID, Foreign Key to books.id, Indexed)
issue_date (DATE)
due_date (DATE, Indexed)
fine_amount (DECIMAL, Default 0)
last_reminder_sent (TIMESTAMP, nullable)
notes (TEXT, nullable)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)

Access Control:

Students can read their own active loans
Admin has full access

7.2.6 reservations
Purpose: Track future book reservations.
Fields:

id (UUID, Primary Key)
student_id (UUID, Foreign Key to users.id, Indexed)
book_id (UUID, Foreign Key to books.id, Indexed)
reserved_from (DATE, Indexed)
reserved_to (DATE, Indexed)
status (ENUM: 'confirmed', 'cancelled', 'expired', 'fulfilled')
created_at (TIMESTAMP)
updated_at (TIMESTAMP)

Access Control:

Students can read their own reservations and create new ones
Admin has full access

Constraints:

Check constraint: reserved_to > reserved_from
Unique constraint on (book_id, date range) to prevent double booking

7.2.7 seats
Purpose: Store library seat information and current booking status.
Fields:

id (UUID, Primary Key)
seat_number (VARCHAR, Unique)
zone (VARCHAR, Indexed)
status (ENUM: 'available', 'occupied', 'maintenance')
occupied_by (UUID, Foreign Key to users.id, nullable)
booking_start (TIMESTAMP, nullable)
booking_end (TIMESTAMP, nullable)
maintenance_notes (TEXT, nullable)
features (JSONB, e.g., {"has_power": true, "near_window": true})
created_at (TIMESTAMP)
updated_at (TIMESTAMP)

Access Control:

Public read access
Students can update (book/release) seats
Admin has full access including maintenance status

7.2.8 reading_history
Purpose: Archive completed loans for historical reference.
Fields:

id (UUID, Primary Key)
student_id (UUID, Foreign Key to users.id, Indexed)
book_id (UUID, Foreign Key to books.id, Indexed)
issue_date (DATE)
due_date (DATE)
return_date (DATE)
fine_amount (DECIMAL)
fine_waived (BOOLEAN, Default false)
waiver_reason (TEXT, nullable)
book_condition (ENUM: 'good', 'fair', 'damaged', 'lost')
notes (TEXT, nullable)
created_at (TIMESTAMP)

Access Control:

Students can read their own history (unless marked private)
Admin has full access

7.2.9 system_settings
Purpose: Store configurable system-wide settings.
Fields:

id (UUID, Primary Key)
setting_key (VARCHAR, Unique, e.g., 'auto_approve_registrations')
setting_value (JSONB)
description (TEXT)
updated_by (UUID, Foreign Key to users.id)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)

Access Control:

Read access for all authenticated users
Update restricted to admin

Example Settings:
{
  "auto_approve_registrations": false,
  "auto_approve_loan_requests": false,
  "max_loan_duration_days": 14,
  "max_concurrent_loans": 5,
  "fine_per_day": 5.00,
  "max_reservation_days": 14,
  "seat_max_duration_hours": 8
}
7.3 Additional Tables (Optional/Future)
7.3.1 acquisition_requests
Purpose: Track student requests for library to acquire new books.
Fields:

id (UUID)
student_id (UUID)
requested_title (VARCHAR)
author (VARCHAR)
justification (TEXT)
upvote_count (INTEGER)
status (ENUM)
created_at (TIMESTAMP)

7.3.2 audit_logs
Purpose: Track critical administrative actions for accountability.
Fields:

id (UUID)
admin_id (UUID)
action_type (VARCHAR)
entity_type (VARCHAR)
entity_id (UUID)
old_values (JSONB)
new_values (JSONB)
notes (TEXT)
created_at (TIMESTAMP)


8. Integration Requirements
8.1 Supabase Authentication
Requirements:

Integration with Supabase Auth for all authentication operations
Support for email/password authentication
Secure session management with JWT tokens
Automatic token refresh for persistent sessions
Role assignment stored in user metadata
Support for password reset flow via email

Security:

Passwords must meet complexity requirements (minimum 8 characters, mix of uppercase, lowercase, numbers)
Failed login attempt tracking and rate limiting
Secure password hashing (handled by Supabase)
HTTPS required for all authentication endpoints

8.2 Supabase Row Level Security (RLS)
Requirements:

RLS policies enforced on all database tables
Policies aligned with role-based access control requirements
Students can only access their own data in profiles, loan_requests, active_loans, reservations
Students have read-only access to books and public user information
Admins have full access to all tables
Service role bypass for administrative functions only

Policy Examples:

profiles table: "Users can select and update their own profile"
active_loans table: "Students can view only their own loans"
books table: "All authenticated users can view books"
system_settings table: "All users can view, only admins can modify"

8.3 Supabase Realtime (Optional Enhancement)
Requirements:

Real-time subscriptions for seat availability updates
Live updates to loan request status for students
Admin dashboard real-time updates for new requests
Optimistic UI updates with server reconciliation

8.4 EmailJS Integration
Purpose: Send transactional emails without backend email server.
Requirements:

EmailJS account with configured email service
Email templates created in EmailJS dashboard for:

Student registration confirmation
Account approval notification
Account rejection notification
Loan request confirmation
Loan approval notification with pickup instructions
Due date reminder (3 days before)
Overdue notice
Fine notification
Reservation confirmation
Reservation reminder (24 hours before)
Reservation cancellation
General administrative notices



Email Template Variables:

Student name
Student email
Book title
Issue date
Due date
Fine amount
Reservation dates
Seat number and zone
Custom message field

Implementation:

EmailJS public key stored in environment variables
Service ID and template IDs configured per email type
Error handling for failed email sends
Retry logic with exponential backoff
Email send logging for audit trail
Admin notification for persistent email failures

Rate Limiting:

Respect EmailJS free tier limits (200 emails/month) or paid tier limits
Batch email sending for bulk operations
Queue system for high-volume periods


9. Non-Functional Requirements
9.1 Performance Requirements
Response Time:

Page navigation within SPA: <200ms
Database query response: <500ms for simple queries, <2s for complex queries
Search results display: <1s for up to 1000 records
Real-time updates: <3s latency

Scalability:

Support minimum 500 concurrent active users
Handle up to 10,000 student accounts
Manage catalog of up to 50,000 book records
Process up to 100 loan requests per hour during peak times

Resource Optimization:

Lazy loading for images and large data sets
Pagination for list views (25-50 items per page)
Efficient database indexing on frequently queried fields
Client-side caching of static data (book categories, system settings)

9.2 Security Requirements
Authentication & Authorization:

All routes protected by authentication except login/signup
Role-based access control enforced at both UI and database levels
Session timeout after 30 minutes of inactivity
Secure token storage (httpOnly cookies or secure localStorage)

Data Protection:

All API communication over HTTPS
Sensitive data encrypted at rest (handled by Supabase)
Password complexity enforcement
Protection against SQL injection via parameterized queries
XSS protection via React's built-in escaping
CSRF protection for state-changing operations

Privacy:

Personal student data accessible only by owner and admins
Reading history privacy option
Email addresses not exposed in public views
Audit logging for sensitive administrative actions

9.3 Reliability & Availability
Uptime:

Target 99.5% uptime during academic term
Planned maintenance during off-hours (nights/weekends)

Error Handling:

Graceful degradation when services unavailable
User-friendly error messages
Automatic retry for transient failures
Fallback mechanisms for critical functions

Data Integrity:

Transaction support for multi-step operations
Referential integrity enforced via foreign keys
Regular automated database backups
Point-in-time recovery capability

9.4 Usability Requirements
User Interface:

Intuitive navigation with clear labels
Consistent layout across all views
Responsive design supporting desktop (minimum 1024px) and tablet (minimum 768px)
Accessible forms with clear validation messages
Loading indicators for async operations

Accessibility:

WCAG 2.1 Level AA compliance target
Keyboard navigation support for all functions
Screen reader compatibility
Sufficient color contrast ratios
Alt text for images
ARIA labels for interactive elements

Internationalization:

Support for three languages: English, Hindi, Kannada
All UI text externalized to translation files
Date and number formatting per locale
Right-to-left (RTL) layout support not required for initial release

Theming:

Dark mode with appropriate contrast
Light mode (default)
Smooth theme transitions
Theme preference persisted across sessions

9.5 Browser Compatibility
Supported Browsers:

Google Chrome (last 2 versions)
Mozilla Firefox (last 2 versions)
Safari (last 2 versions)
Microsoft Edge (last 2 versions)

Mobile Browser Support:

Chrome for Android
Safari for iOS

9.6 Maintainability Requirements
Code Quality:

TypeScript for type safety
ESLint and Prettier for code consistency
Component-based architecture for reusability
Clear separation of concerns (views, logic, data access)
Comprehensive inline code comments
README documentation for setup and deployment

Testing:

Unit tests for critical business logic
Integration tests for key user flows
Manual testing checklist for releases

Monitoring:

Error tracking and logging
Performance monitoring
Usage analytics (page views, feature usage)


10. User Workflows
10.1 Student User Journeys
10.1.1 New Student Registration

Navigate to application URL
Click "Sign Up" on authentication view
Fill registration form with personal and academic details
Submit form
Receive confirmation message indicating account pending approval
Receive email confirmation of registration
Wait for admin approval
Receive approval email with login instructions
Log in and access full student features

10.1.2 Borrowing a Book

Log in to student account
Click "Browse Catalog" from dashboard
Search for desired book by title or author
Click on book from search results
View book details and availability
Click "Request Book" button
Confirm request in modal
Receive confirmation message
Receive email notification
Wait for admin approval (if auto-approve disabled) or immediate loan creation (if auto-approve enabled)
Receive approval email with pickup instructions
Visit library to collect book
Admin marks book as issued, updating active loans

10.1.3 Booking a Library Seat

Log in to student account
Navigate to "Seats" tab
View floor map with seat availability
Select zone from dropdown (optional)
Click on available (green) seat
Review booking confirmation modal with duration options
Select desired duration
Accept terms and confirm
Seat immediately marked as occupied
Dashboard updated with seat booking details
Study session at booked seat
Click "Release Seat" when finished or seat auto-released after duration

10.2 Admin User Journeys
10.2.1 Approving Student Registration

Log in to admin account
Navigate to "User Registry" tab
Click "Pending Approvals" filter
Review student registration details
Click "Approve" button
Confirm approval
Student account status updated to Active
Student receives approval email
Student can now log in and use system

10.2.2 Processing Book Return

Log in to admin account
Navigate to "Circulation" tab
Locate active loan in table (search or filter)
Student returns physical book to library desk
Click "Process Return" button
Review return modal with book and student details
Assess book condition (select from dropdown)
Confirm return date (defaults to today)
Review auto-calculated fine (if overdue)
Optionally waive fine with justification
Add notes if needed
Click "Confirm Return"
Loan moved to reading history
Book availability count incremented
Student receives return confirmation email (with fine details if applicable)

10.2.3 Adding New Book to Catalog

Log in to admin account
Navigate to "Inventory Management" tab
Click "Add New Book" button
Fill book details form (title, author, ISBN, category, copies, etc.)
Upload cover image or provide URL
Submit form
System validates ISBN and required fields
Book record created in database
Confirmation message displayed
Book appears in catalog immediately
Available for student searches and requests


11. Acceptance Criteria
11.1 Functional Acceptance Criteria
Authentication:

 Students can successfully register with valid information
 New registrations create account with Pending status
 Students and admins can log in with valid credentials
 Invalid credentials display appropriate error message
 Password reset flow sends email and allows password change
 Sessions persist across page refreshes
 Sessions expire after 30 minutes of inactivity
 Logged-out users redirected to login page

Student Features:

 Dashboard displays accurate statistics from database
 Students can search books by title, author, ISBN, category
 Book details display correctly with all information
 Students can submit loan requests for available books
 Loan requests blocked when student has unpaid fines above threshold
 Students can reserve books using calendar for future dates
 Reservation dates cannot overlap with existing reservations
 Students can cancel future reservations
 Students can book available seats from floor map
 Only one seat can be booked per student at a time
 Seats auto-release after booking duration expires
 Students can manually release booked seats
 Profile displays correct student information
 Students can update editable profile fields
 Reading history displays past loans accurately

Admin Features:

 Admins can view all pending student registrations
 Admins can approve student accounts, updating status to Active
 Admins can reject student accounts with reason
 Admins can add new books with all required fields
 ISBN validation prevents duplicates with warning
 Admins can edit existing book details
 Admins can delete books (soft delete preferred)
 Deletion blocked for books with active loans
 Auto-approve toggles work correctly for registrations and loans
 System settings persist across sessions
 Pending loan requests display in admin circulation view
 Admins can approve loan requests, creating active loans
 Admins can reject loan requests with reason
 Active loans table displays all current loans accurately
 Admins can process returns, moving loans to history
 Fine calculation automated based on overdue days
 Admins can waive fines with justification
 Email reminders send successfully
 Admins can edit student records
 Admins can change student account status
 Status changes logged with admin user and timestamp
 Admins can mark seats as under maintenance
 Reset floor function releases all seats and notifies students

Data Integrity:

 All database operations complete successfully
 Book availability counts update correctly on issue/return
 Seat status updates in real-time across sessions
 No orphaned records after deletions
 Referential integrity maintained via foreign keys
 Timestamps automatically populated on create/update

Email Notifications:

 Registration confirmation emails sent to new students
 Approval emails sent when accounts activated
 Loan approval emails sent with pickup instructions
 Due date reminders sent 3 days before due date
 Overdue notices sent for late returns
 Reservation confirmations sent when reservations created
 Fine notifications sent when fines applied
 All emails include correct dynamic data
 Failed email sends logged for admin review

11.2 Non-Functional Acceptance Criteria
Performance:

 Page navigation completes in under 200ms
 Search results display in under 1 second for typical queries
 Dashboard loads with all statistics in under 2 seconds
 Application supports 100 concurrent users without degradation

Security:

 All pages require authentication except login/signup
 Students cannot access admin-only routes
 Students can only view their own loans and requests
 RLS policies enforced on all database queries
 Passwords meet complexity requirements
 Sessions secure with httpOnly tokens or equivalent

Usability:

 All forms include clear validation messages
 Loading indicators display during async operations
 Error messages are user-friendly and actionable
 Navigation intuitive without training
 Consistent layout across all views
 Responsive design works on desktop (1024px+) and tablet (768px+)

Accessibility:

 All interactive elements keyboard accessible
 Form inputs have associated labels
 Color contrast meets WCAG AA standards
 ARIA labels present on custom components

Theming & Localization:

 Dark mode toggle switches theme correctly
 Theme preference persists across sessions
 Language toggle switches UI text to selected language
 Language preference persists across sessions
 All three languages (en, hi, kn) supported with complete translations

Browser Compatibility:

 Application functions correctly in Chrome (latest)
 Application functions correctly in Firefox (latest)
 Application functions correctly in Safari (latest)
 Application functions correctly in Edge (latest)


12. Out of Scope (Future Enhancements)
The following features are explicitly excluded from the initial release but may be considered for future iterations:
Phase 2 Potential Features:

Mobile applications (iOS/Android native apps)
QR code generation for book pickup verification
Self-checkout kiosk mode
SMS notifications in addition to email
Integration with college ID card system for automatic authentication
Advanced analytics dashboard with charts and trends
Export functionality for reports (CSV, PDF)
Recommendation engine based on reading history
Waitlist functionality for popular books
Inter-library loan support
Digital resource management (e-books, journals)
Discussion forums or book reviews from students

Advanced Admin Features:

Bulk import of book records via CSV
Integration with ISBN lookup APIs for auto-filling book details
Barcode scanning for physical book tracking
Automated inventory auditing
Budget tracking for acquisitions
Vendor management
Statistics on library usage patterns

Student Experience Enhancements:

Personal reading goals and challenges
Social features (share what you're reading, follow friends)
Browser extension for quick catalog searches
Progressive Web App (PWA) for offline access to basic features
Push notifications for mobile browsers
Calendar integration for due dates
Saved searches and alerts for new arrivals


13. Assumptions & Constraints
13.1 Assumptions

Library staff has basic computer literacy and can be trained on the admin interface
Students have access to email and check it regularly
College provides stable internet connectivity in library
Supabase free tier or paid plan is sufficient for expected user base and data volume
EmailJS service remains available and reliable
Physical book checkout process handled manually by library staff after digital request approval
Existing library has cataloged its collection with ISBN and basic metadata available
Initial deployment will be on college network or public URL accessible to students

13.2 Constraints

Budget: Project assumes use of free or low-cost services (Supabase free tier, EmailJS free tier initially)
Timeline: Development timeline not specified in requirements; assume iterative development
Resources: Development team size and composition not specified
Infrastructure: Limited to Supabase capabilities; cannot use custom backend servers
Compliance: Must comply with applicable data protection regulations for student information
Styling: Restricted to CSS and Bootstrap; Tailwind CSS explicitly prohibited
Offline Access: SPA architecture requires internet connectivity; no offline mode in initial release


14. Dependencies & Risks
14.1 External Dependencies

Supabase Platform: Critical dependency for authentication, database, and storage

Risk: Service outages impact application availability
Mitigation: Monitor Supabase status page; consider backup authentication mechanism


EmailJS Service: Required for all email notifications

Risk: Service disruption prevents email sending
Mitigation: Implement retry queue; have manual notification process as backup


Third-Party Libraries: React, TypeScript, Bootstrap dependencies

Risk: Breaking changes in library updates
Mitigation: Pin dependency versions; test upgrades in staging environment



14.2 Technical Risks

Scalability: Free tier limitations on Supabase and EmailJS

Risk: Exceeding free tier limits during peak usage
Mitigation: Monitor usage; plan for upgrade to paid tiers; implement rate limiting


Data Migration: Initial import of existing library catalog

Risk: Data quality issues, missing metadata
Mitigation: Data validation scripts; manual review process for critical records


Browser Compatibility: Potential issues with older browsers

Risk: Students using unsupported browsers cannot access system
Mitigation: Display compatibility notice; provide browser upgrade guidance



14.3 Operational Risks

User Adoption: Students may resist transition from manual/existing system

Risk: Low usage rates, continued manual processes
Mitigation: Training sessions; promotional campaign; phased rollout; feedback collection


Admin Training: Library staff may require significant training

Risk: Errors in data entry, incorrect approvals
Mitigation: Comprehensive training program; user documentation; sandbox environment for practice


Data Privacy: Handling of student personal information

Risk: Privacy violations, regulatory compliance issues
Mitigation: RLS policies; regular security audits; privacy policy; compliance review




15. Success Metrics & KPIs
15.1 Usage Metrics

User Adoption:

Number of registered students (target: 80% of eligible students within first semester)
Daily active users (target: 30% of registered students)
Login frequency per user


Feature Utilization:

Book searches per day
Loan requests per day
Seat bookings per day
Reservation requests per day



15.2 Efficiency Metrics

Administrative Time Savings:

Average time to process loan request (target: <2 minutes)
Number of auto-approved requests vs. manual
Reduction in manual record-keeping time


Student Self-Service:

Percentage of requests initiated by students (target: 90%+)
Percentage of seat bookings self-service (target: 95%+)



15.3 Quality Metrics

System Performance:

Average page load time (target: <2 seconds)
System uptime percentage (target: 99.5%)
Error rate (target: <1% of transactions)


User Satisfaction:

User satisfaction survey score (target: 4/5 or higher)
Number of support tickets or issues reported
Feature request feedback volume



15.4 Library Operations Metrics

Resource Utilization:

Seat occupancy rate (target: 25% increase)
Book circulation rate
Average loan duration


Financial Metrics:

Fine collection rate (target: 80%+ of assessed fines)
Overdue rate (target: reduce by 30%)


Communication Effectiveness:

Email delivery rate (target: 98%+)
Email open rate for reminders
Reduction in overdue items after reminder implementation




16. Deployment & Rollout Plan
16.1 Pre-Deployment Phase

Complete development and internal testing
Set up production Supabase project
Configure production EmailJS account and templates
Create admin user accounts for library staff
Import existing book catalog data
Import existing student records (if applicable)
Create user documentation (student guide, admin manual)
Conduct admin training sessions

16.2 Pilot Phase

Deploy application to limited user group (e.g., one department or class)
Monitor usage and collect feedback
Fix critical bugs and usability issues
Refine processes based on real-world usage
Duration: 2-4 weeks

16.3 Full Rollout Phase

Announcement to entire student body
Phased registration windows by academic year or department
On-site support staff available during initial weeks
Monitor system performance and scale resources as needed
Collect ongoing feedback via in-app feedback mechanism

16.4 Post-Deployment

Weekly review meetings for first month
Monthly review meetings thereafter
Continuous monitoring of metrics and KPIs
Regular updates based on feedback
Plan for future enhancements based on usage data


17. Support & Maintenance
17.1 User Support

Help documentation accessible from application
FAQ section for common questions
Contact email for technical support
Library staff available for in-person assistance during operating hours

17.2 Technical Maintenance

Regular database backups (automated daily)
Security updates for dependencies
Performance monitoring and optimization
Bug fix releases as needed
Scheduled maintenance windows communicated in advance

17.3 Content Maintenance

Admin-driven updates to book catalog
Regular review and cleanup of inactive student accounts
Periodic audit of system settings
Review and update of email templates as needed


18. Appendices
18.1 Glossary

Active Loan: A currently issued book that has not yet been returned
Admin: User with administrative privileges (librarian or system administrator)
Auto-Approve: System setting that automatically processes certain requests without manual review
Available Copies: Number of copies of a book currently available for loan
Due Date: Date by which a borrowed book must be returned
Fine: Monetary penalty for overdue books or damaged materials
Floor Map: Visual representation of library seating layout
Loan Request: Student's application to borrow a book
RLS (Row Level Security): Database security feature that restricts data access based on user identity
Pending Status: Account state awaiting administrative approval
Reservation: Booking of a book for future dates when currently unavailable
Seat Booking: Reservation of a library seat for study
SPA (Single-Page Application): Web application that loads a single HTML page and dynamically updates content
Supabase: Backend-as-a-Service platform providing database, authentication, and storage
Total Copies: Complete number of copies of a book in library collection

18.2 Reference Documents

Supabase Documentation: https://supabase.com/docs
EmailJS Documentation: https://www.emailjs.com/docs/
React TypeScript Documentation: https://react.dev/learn/typescript
Bootstrap Documentation: https://getbootstrap.com/docs/
WCAG 2.1 Guidelines: https://www.w3.org/WAI/WCAG21/quickref/

18.3 Version History
VersionDateAuthorDescription1.0January 16, 2026Product TeamInitial PRD for SmartLIB-JAIN

19. Approval & Sign-Off
This Product Requirements Document has been prepared for review and approval by stakeholders.
Prepared By:
Product Management & Architecture Team
Review & Approval Required From:

 Product Owner
 Technical Lead
 Library Director / Head Librarian
 College IT Department
 Development Team Lead