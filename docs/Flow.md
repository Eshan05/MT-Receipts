**I. User Authentication and Access (Admin Only)**

1.  **Initial Access/Signup:**

    *   An administrator navigates to the application's URL.
    *   If no admin user exists (first-time setup), they are presented with a signup form:
        *   **Fields:** Username, Email, Password.
        *   **Process:**
            *   The frontend validates the input. Zod could be used for this on the client and/or server.
            *   The frontend sends a `POST` request to a `/api/signup` (or similar) endpoint.
            *   The backend:
                *   Checks if a user with the given email or username already exists in the `Users` collection. If so, returns an error.
                *   Hashes the password using `bcrypt`.
                *   Creates a new document in the `Users` collection with the username, email, and hashed password (`passhash`).
                *   Returns a success response.

2.  **Login:**

    *   The administrator is presented with a login form:
        *   **Fields:** Email, Password.
        *   **Process:**
            *   Frontend validation
            *   Frontend sends a `POST` request to a `/api/login` endpoint.
            *   Backend:
                *   Finds a user in the `Users` collection matching the provided email.
                *   If no user is found, returns a 401 (Unauthorized) error.
                *   If a user is found, uses `bcrypt.compare` to compare the provided password with the stored `passhash`.
                *   If passwords don't match, returns a 401 error.
                *   If passwords match:
                    *   Creates a JWT (JSON Web Token) using `jose`. The payload of the JWT should include the user's email (used as a unique identifier).  It *should not* include sensitive information like the password hash. Include a unique, randomly generated ID (NanoID) in the payload, to allow for token invalidation if needed.
                    *   Sets the JWT in an HTTP-only, secure cookie using `cookies-next`.  The cookie should have a reasonable expiration time.  `httpOnly` and `secure` flags should be set to `true` in production.
                    *   Updates the user's `lastLogin` field in the `Users` collection.
                    *   Returns a 200 (OK) response.

3.  **Authentication Check (Protected Routes):**

    *   For any route that requires administrator access (e.g., viewing events, creating receipts), the frontend uses the `useAuthen` hook (provided in the schema).
    *   **Process (within `useAuthen`):**
        *   On every route change (using `useEffect` and `router.pathname`), the hook attempts to retrieve the `authToken` cookie using `getCookie`.
        *   If no token is found, the user is redirected to the login page (`/`).
        *   If a token is found:
            *   The token is verified using `jwtVerify` and the same secret used to sign it.
            *   If verification fails (Token expired, invalid signature), the user is redirected to the login page.
            *   If verification succeeds, the `authenticated` state is set to `true`, allowing access to the protected route.

**II. Event Management**

1.  **Viewing Events:**

    *   After successful login, the admin is likely directed to an "Events" page (e.g., `/events`).
    *   **Process:**
        *   Frontend sends a `GET` request to `/api/events`.
        *   Backend:
            *   Queries the `Events` collection to retrieve all events.
            *   Returns an array of event documents.
        *   Frontend:
            *   Displays the list of events, perhaps in a table or list format.  Each event might show its `name`, `type`, `eventCode`, and potentially a summary of `itemAnalytics`.

2.  **Creating a New Event:**

    *   On the "Events" page, there's a "Create Event" button.
    *   Clicking this button navigates to a "Create Event" form (`/events/create`).
    *   **Form Fields:**
        *   `name`
        *   `type`
        *   `desc`
        *   `eventCode`
        *   `items`:  This is a dynamic section.
            *   Initially, there might be one set of item fields (name, description, price).
            *   An "Add Item" button allows adding more item sets.
    *   **Process:**
        *   Frontend validation
        *   Frontend sends a `POST` request to `/api/events/create`.
        *   Backend:
            *   Checks for duplicate `eventCode`.
            *   Creates a new document in the `Events` collection.
            *   Calculates the item wise analytics
            *   Returns a success response, possibly including the newly created event's `_id`.
        *   Frontend:
            *   Redirects the user to the event's detail page (`/events/[eventCode]`) or back to the events list.

3.  **Viewing an Event's Details:**

    *   Clicking on an event in the events list navigates to the event detail page (`/events/[eventCode]`).
    *   **Process:**
        *   Frontend sends a `GET` request to `/api/events/[eventCode]`.
        *   Backend:
            *   Finds the event in the `Events` collection matching the `eventCode`.
            *   Returns the event document, *including* the `purchases` array.  This is crucial.
        *   Frontend:
            *   Displays the event details (name, description, ...).
            *   Renders a table of purchases:
                *   **Columns:** User (Name, Email, Phone), Payment Method, Items Purchased (details from the nested `items` array), Timestamp, Status, "Receipt Sent" (Yes/No - this will require logic, explained below) and more if required.
            * Showcases the `itemAnalytics` differently

4.  **Adding/Editing Purchases:**

    *   Within the event detail table, there are options to:
        *   **Add Purchase:**  A button/link opens a modal or form.
            *   **Form Fields:**  User details (or a dropdown to select an existing user), Payment Method, Items (dynamically addable, similar to event creation), Status.
            *   **Process:** Similar to the steps of creating an event, this will be added to the `purchases` array in the specific `Event` document in which the admin is in
        *   **Edit Purchase:** Clicking an "Edit" icon/button on a purchase row opens a similar form, pre-populated with the existing purchase data.
            *   Backend:
                * A simple PATCH OR PUT action on it

**III. Receipt Management**

1.  **Sending Receipts (Bulk):**

    *   On the event detail page's purchases table, there's a "Select All" checkbox and a "Send Receipts" button.
    *   **Process:**
        *   The user selects multiple purchases (or all) using checkboxes.
        *   Clicks "Send Receipts".
        *   Frontend displays a modal/dropdown to select a `ReceiptTemplate`.
        *   Frontend sends a `POST` request to `/api/events/[eventCode]/send-receipts`.
            *   **Request Body:**  `purchaseIds` (array of selected purchase IDs), `templateId`.
        *   Backend:
            *   Retrieves the selected `ReceiptTemplate`.
            *   Iterates through the `purchaseIds`:
                *   Finds the corresponding purchase within the `Event` document's `purchases` array.
                *   Constructs the data needed for the receipt:
                    *   Customer information (from `purchase.user`).
                    *   Items purchased (from `purchase.items`).
                    *   Total amount (calculated from `purchase.items`).
                    *   Payment method (from `purchase.paymentMethod`).
                *   Creates a new `Receipt` document.  Key fields:
                    *   `receiptCode`: Generate a unique code.
                    *   `eventId`:  The `_id` of the event.
                    *   `purchaseIds`:  An array containing *this* purchase's ID.
                    *   `templateId`:  The selected template's `_id`.
                    *   `customer`, `items`, `totalAmount`, `paymentMethod`: Populated from the purchase data.
                    *   `emailLog`:  Initialized as an empty array.
                *   Generates the PDF using `react-pdf`, passing the constructed data as props to the template component.  The template component handles the layout and styling.
                *   Sends the PDF as an email attachment using `mailgun.js`.
                    *   Recipient: `purchase.user.email`.
                    *   Subject:  "Your Receipt for [Event Name]".
                    *   Body:  A message like "Attached is your receipt."
                    *   Body will have attachment which might be a blob/stream or a file in repo that is edited and sent (It gets edited only for that process automatically)
                *   Updates the `Receipt` document's `emailLog`:
                    *   Adds an entry with `emailSentTo`, `status` ("sent" or "failed"), and `sentAt`.
                *   Update `status` in purchases array to completed instead of pending. This is how the "Receipt Sent" column in the table would be populated.
            *   Returns a success response, possibly with information about how many receipts were successfully sent.
        *   Frontend:
            *   Displays a success/failure message.
            *   Refreshes the purchases table to reflect the updated "Receipt Sent" status.

2.  **Sending a Receipt (Single):**

    *   Similar to bulk sending, but initiated from a button/link on a *single* purchase row in the table.  The `purchaseIds` array in the request body would contain only one ID.

3.  **One-Off Receipts:**

    *   A separate route/page (e.g., `/receipts/one-off`).
    *   **Form Fields:**
        *   Customer details (Name, Email, Phone Number).
        *   Items (dynamically addable: Description, Quantity, Price).
        *   Total Amount (could be automatically calculated or manually entered).
        *   Payment Method.
        *   Receipt Template (dropdown of templates with `templateType: 'one-off'`).
    *   **Process:**
        *   Frontend validation.
        *   Frontend sends a `POST` request to `/api/receipts/one-off/create`.
        *   Backend:
            *   Creates a new `Receipt` document. *Crucially*, `eventId` will be `null` or a designated "one-off" event ID.
            *   Generates the PDF using `react-pdf`.
            *   Sends the email using `mailgun.js`.
            *   Updates the `emailLog`.
            *   Returns a success response.

4.  **Viewing Receipts:**
    *   The requirements mention two ways to view receipts:
    *   **Bulk (Entire Table):**
        * This can be fetched using the events route.
        * The table should showcase if the receipt has been sent or not
        * If the receipt has been sent we can see it using the slug
    *   **Single User**
        * The receipts can be fetched from a specific event's table
        * If sent, then the receipt will be visible on the slug URL (explained below).

5.  **Viewing Receipts (Slug URL):**

    *   A route like `/receipts/[receiptCode]` is used to display a specific receipt.
    *   **Process:**
        *   Frontend sends a `GET` request to `/api/receipts/[receiptCode]`.
        *   Backend:
            *   Finds the `Receipt` document matching the `receiptCode`.
            *   If not found, returns a 404 error.
            *   If found:
                *   Retrieves the associated `receiptSchema` entry.
                *   Constructs the data needed for the receipt (similar to sending).
                *   Generates the PDF using `react-pdf`, passing the data as props.
                *   Instead of emailing, it renders the PDF directly in the browser (or provides a download link). This is a key difference.

6. **View/Edit Template**:
    *    Frontend sends a `GET` request to `/api/templates`.
    *    Backend:
        *    Finds all the templates.
        * If not found returns a 404.
        * Returns all the `ReceiptTemplate` documents

**IV. Receipt Template Management**

1.  **Viewing Templates:**

    *   A route like `/templates` displays a list of all receipt templates.
    *   **Process:**
        *   Frontend sends a `GET` request to `/api/templates`.
        *   Backend:
            *   Queries the `ReceiptTemplate` collection to retrieve all templates.  You might filter to show only `isActive: true` templates.
            *   Returns an array of template documents.
        *   Frontend:
            *   Displays the list of templates, showing their `name`, `description`, and `templateType`.

2.  **Creating/Editing Templates:**
    * **Creating**
     * Will make it ourselves (Internally by the team) making a component in the repository using `react-pdf`
    *  **Editing:**
        *   The template editing will happen within the `react-pdf` component itself. This will require some setup with state management to make the component's content editable. The `react-pdf` library does have an imperative API so you will be able to modify them.
        *   When the admin is done editing, a "Save" button would trigger a `PUT` or `PATCH` request to `/api/templates/[templateId]`.
        *   Backend:
            *   Finds the `ReceiptTemplate` document.
            *   Updates the relevant fields, updates and stores back the blob.
            *   Sets `updatedAt` to the current time.
            *   Returns a success response.