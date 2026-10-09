# AstroThread — MVP Scope and Feature Decisions

## 1. Project Scope

AstroThread is an interactive astronomy and physics research platform that organizes scientific research into guided Research Threads. The platform connects research papers, discovery timelines, data visualizations, NASA media, and AI-powered explanations.

The MVP will prioritize essential features that can realistically be implemented by one developer within three months.

## 2. User Roles and Permissions

The platform will have two roles: **User** and **Owner**.

### User

* Register and log in.
* Browse and search research threads.
* View research thread details and related papers.
* Explore discovery timelines and data visualizations.
* View relevant NASA media.
* Use the AI Research Assistant.
* Bookmark research threads.
* Manage profile information and change password.
* View current subscription plan and status.

### Owner

* Access the Owner dashboard.
* Create, edit, and delete research threads.
* Manage research thread information and related content.
* Manage timeline events and research visualization data.
* Access Owner-only features protected by backend authorization.

Owner permissions are separate from subscription plans. A Premium subscription does not grant Owner privileges.

## 3. Subscription Plans

AstroThread will include two subscription plans: **Free** and **Premium**.

### Free Plan

* Browse and search research threads.
* View research papers and thread details.
* Explore discovery timelines and data visualizations.
* Access relevant NASA media.
* Use the AI Research Assistant with basic usage limits.
* Bookmark research threads.

### Premium Plan

* Includes all Free plan features.
* Provides increased AI Research Assistant usage limits.

Exact usage limits, prices, and billing periods will not be defined until they are confirmed and can be implemented.

## 4. Subscription Implementation

For the MVP, subscriptions will use a **demo activation flow without real payments**.

* Users can view and compare the Free and Premium plans.
* Free users can select the Upgrade to Premium option.
* The backend will activate the demo Premium plan and save the subscription status in the database.
* The Profile page will display the user's current plan and subscription status.
* Premium-only limits must be checked by the backend, not only hidden or displayed differently in the frontend.

The MVP will not process real payments, collect payment card information, or generate real invoices.

## 5. User Interface Changes

The existing AstroThread Figma design will be updated without redesigning the entire project.

### Subscription Plans Page

The page will include:

* Free and Premium plan cards.
* A comparison of available features.
* An indication of the user's current plan.
* An Upgrade to Premium button for Free users.
* A clear confirmation state after demo activation.

### Profile Page

The page will include:

* Basic profile information.
* Current subscription plan.
* Subscription status.
* An action to view or upgrade the plan.
* An option to change the password.

### Owner Dashboard

The dashboard will provide simple content management features:

* Create research threads.
* Edit existing research threads.
* Delete research threads.
* Manage associated timeline events and visualization data.

The interface will reuse the existing design system, colors, typography, buttons, and components.

## 6. Database Requirements

The database will include a `subscriptions` table to store subscription information.

Suggested fields:

* `id`
* `user_id`
* `plan`
* `status`
* `start_date`
* `end_date`
* `created_at`
* `updated_at`

The `user_id` field will reference the user who owns the subscription.

The subscription plan and user role will be stored and managed separately. Subscription status and Premium access must be validated by the backend.

## 7. Security Requirements

* Passwords must be securely hashed and never stored as plain text.
* Authenticated endpoints must validate the user's authentication token.
* Owner-only endpoints must verify the Owner role on the backend.
* Users must not be able to modify another user's profile, bookmarks, or subscription.
* Premium-only functionality must be checked by the backend.
* Password changes must verify the current password before accepting a new password.
* Input validation and appropriate error responses must be implemented.

## 8. Testing Requirements

Testing will cover the following scenarios:

* User registration and login.
* Invalid credentials and password changes.
* Access restrictions for unauthenticated users.
* User and Owner authorization.
* Creating, editing, and deleting research threads.
* Subscription activation and status updates.
* Free and Premium feature restrictions.
* Preventing users from modifying other users' data.
* Successful and unsuccessful API requests.

## 9. MVP Limitations and Future Improvements

The following features are outside the initial MVP scope:

* Real payment processing and billing.
* Multiple subscription tiers beyond Free and Premium.
* Advanced subscription analytics.
* Interactive physics simulations.
* Additional external research integrations beyond those required for the MVP.
* Streaks, achievements, and other gamification features.

These features may be considered after the MVP is completed.

## 10. Implementation Principle

All documented features must match the actual implementation. Features that are not implemented must be clearly identified as planned or out of scope.

The priority is to deliver a functional, secure, and coherent MVP with a manageable scope for a single developer, rather than introducing unnecessary complexity.
