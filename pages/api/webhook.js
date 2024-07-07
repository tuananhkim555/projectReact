import { mongooseConnect } from "@/lib/mongoose";
import { Order } from "@/models/Order";
const stripe = require('stripe')(process.env.STRIPE_SK);
import { buffer } from 'micro';
const endpointSecret = "whsec_956810eab5176e1a308253e36274641f1bbfff315835e6f4793aacd729dd8e5c";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        res.status(405).end('Method Not Allowed');
        return;
    }

    await mongooseConnect();
    const sig = req.headers['stripe-signature'];

    let event;

    try {
        const buf = await buffer(req);
        event = stripe.webhooks.constructEvent(buf, sig, endpointSecret);
    } catch (err) {
        console.log(`⚠️  Webhook signature verification failed.`, err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const data = event.data.object;
            const orderId = data.metadata.orderId;
            const paid = data.payment_status === 'paid';
            if(orderId && paid) {
                await Order.findByIdAndUpdate(orderId, {
                    paid:true,
                })
            }
            // Thêm logic xử lý khi thanh toán thành công
            break;
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Trả về phản hồi để xác nhận đã nhận được sự kiện
    res.status(200).send('Received');
}

export const config = {
    api: {
        bodyParser: false,
    },
};



//proven-vivid-leads-helped
// acct_1PZi1HCQLSFPmvdi