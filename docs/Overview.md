# Receipts (Internal use only)

Platform which our team will use to send receipts for any events.

## Users

1. An application (Next + Mongo) only meant for admins. Will have simple mail and password login/sign-up with `jose` and `cookies-next` with something like this. Will see if any improvements can be made

```ts
import dbConnect from "@utils/db";
import Url from '@models/url';
import { NextApiRequest, NextApiResponse } from "next";
import { nanoid } from 'nanoid'
import { SignJWT } from 'jose'
import { setCookie } from 'cookies-next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { passcode } = req.body;
    try {
      await dbConnect();
      const url = await Url.findOne({ q: passcode });

      if (url) {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || '5322c9714a5e9451e84e9f4da58074b4d2af21cb9bafa65a2bbdf8de9f95e5b3');
        const payload = { passcode: url.q, uniqueId: nanoid() };

        const token = await new SignJWT(payload)
          .setProtectedHeader({ alg: 'HS256' })
          .setExpirationTime('2h')
          .sign(secret)

        setCookie('authToken', token, {
          req,
          res,
          path: '/',
          maxAge: 7200,
          sameSite: 'strict',
          httpOnly: process.env.NODE_ENV === 'production', // Make false if not working
          secure: process.env.NODE_ENV === 'production', // Same
        });

        return res.status(200).json({ message: 'Authenticated successfully' });
      } else {
        return res.status(401).json({ message: 'Invalid passcode' });
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
      }
    }
  } else {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }
}
```
```ts
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { jwtVerify } from 'jose';
import { getCookie } from 'cookies-next';

export const useAuthen = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuthentication = async () => {
      const token = await getCookie('authToken');
      // console.log(token)

      if (token && typeof token === 'string' && token.trim() !== '') {
        try {
          const secret = new TextEncoder().encode(process.env.JWT_SECRET || '5322c9714a5e9451e84e9f4da58074b4d2af21cb9bafa65a2bbdf8de9f95e5b3');
          await jwtVerify(token, secret, { algorithms: ['HS256'] });
          setAuthenticated(true);
        } catch (error) {
          // console.error("T:", error);
          setAuthenticated(false);
          router.push(`/`);
        }
      } else {
        // console.log("No token found");
        setAuthenticated(false);
        router.push(`/`);
      }
    };

    checkAuthentication();
  }, [router.pathname]);

  return authenticated;
};
```
```js
// Schema for admin login, only admins allowed on platform. Does not refer to recipients
const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passhash: { type: String, required: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
})
```

## Events

2. Once signed in you can see all the events. You can go to an event and there you will see a table of users and all items related to that event. This table also will show details like whether a receipt was sent to the user or not, what purchases they had for event. Will use this schema

```js
const Events = new Schema({
  // Will use _id for other stuff
  eventCode: { type: Number, required: true, unique: true },
  type: { type: String, enum: ["seminar", "workshop", "other"] },
  name: { type: String, required: true },
  desc: { type: String },
  items: [{
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
  }],
  createdAt: { type: Date, default: Date.now },
  purchases: [{
    purchaseId: { type: String, required: true, unique: true },
    user: {
      // userId: { type: String, required: true }, 
      name: { type: String },
      email: { type: String },
      phone: { type: String }
    },
    paymentMethod: { type: String },
    items: [{
        itemId: { type: String, required: true },
        itemName: { type: String, required: true },
        itemDesc: { type: String },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
    }],
    timestamp: { type: Date, default: Date.now },
    status: {type: String, enum: ['pending', 'completed', 'cancelled', 'refunded'], default: 'pending'}
  }],
  itemAnalytics: [{
    itemName: { type: String },
    totalSold: { type: Number },
    totalRevenue: { type: Number }
  }],
});
```

3. To actually send receipts, you go to the table select all users and hit send receipt button, then it will show you select a receipt template. Templates will be made using `react-pdf` and mailed using `mailgun.js`, the template will automatically be made based on the recipient's purchases passing as props. Need to make a schema for it.

## Extra

4. Should be able to do one-off receipts too, just select a user from a table, select a receipt for them. Can also implement functionality to do it from scratch, that is put in the recipient's details including their purchases and receipt template and mail to them.
5. Receipts schema

```js
const receiptSchema = new Schema({
  receiptCode: { type: String, required: true, unique: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  purchaseIds: [{ type: String, ref: 'Event.purchases' }],
  templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'ReceiptTemplate' },
  customer: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String },
  },
  items: [
    {
      description: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    },
  ],
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String },
  createdAt: { type: Date, default: Date.now },
  emailLog: [
    {
      emailSentTo: { type: String, required: true },
      status: { type: String, enum: ['sent', 'failed'], required: true },
      sentAt: { type: Date, default: Date.now },
    },
  ],
})
```

6. Template Schema
```js
const ReceiptTemplateSchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }, 
  templateType: { type: String, enum: ['event', 'one-off'], default: 'event' }, 
  // All metadata  and other things will be done by react-pdf
});
```
7. There will be admin signup but no reset or forgot password functionality, since we control the database we can just delete and make new.
8. Should be way to create new events completely
9. Can add purchases or edit a user's purchases in the table
10. Can see receipts in bulk (Entire table) or just to one user
11. View receipt and to edit will just edit the component where `react-pdf` is used, will have to hard code the design of the template but will have dynamic values for name and such
12. A separate route for one off receipts
13. A simple route where we can see all the templates (Not one-offs)
14. Won't be storing the files because file storage solutions are expensive

15. Other libraries 
    1. Mongoose
    2. ShadCN
    3. Zod
    4. Bcrypt