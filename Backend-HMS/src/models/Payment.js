const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
    paymentId: { type: String, unique: true },
    billId: {
        type: String,
        ref: "Bill",
        required: true
    },
    amount: {
        type: String,
        ref: "Bill"
    },
    method: {
        type: String,
        enum: ["Cash", "Card", "UPI"],
        required: true
    },
    paidAt: {
        type: Date,
        default: Date.now
    },
    receivedByEmployeeId: {
        type: String,
        ref: "Employee"
    }
}, {
    timestamps: {
        createdAt: "created_at",
    }
});

paymentSchema.pre('save', async function (next) {
    if (this.isNew) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { name: 'Payment' },
                { $inc: { seq: 1 } }, // Creates sequence
                { new: true, upsert: true } // upsert is update and insert
            );
            this.paymentId = `PAY-${String(counter.seq).padStart(6, '0')}`; // create 6 digit sequence number
        } catch (err) {
            return next(err);
        }
    }
    next();
});

module.exports = mongoose.model('Payment', paymentSchema);