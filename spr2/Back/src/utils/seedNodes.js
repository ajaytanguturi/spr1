require("dotenv").config();
const mongoose = require("mongoose");
const Node = require("../models/Nodes");

const DEFAULT_NODES = [
    {
        name: "Employees",
        path: "/dashboard/employees",
        icon: "users",
        allowedDesignations: ["OWNER", "ADMIN"]
    },
    {
        name: "Approvals",
        path: "/dashboard/approvals",
        icon: "check-circle",
        allowedDesignations: ["OWNER", "ADMIN"]
    },
    {
        name: "Admins",
        path: "/dashboard/admins",
        icon: "shield",
        allowedDesignations: ["OWNER"]
    },
    {
        name: "Patients",
        path: "/dashboard/patients",
        icon: "user",
        allowedDesignations: ["OWNER", "ADMIN", "RECEPTIONIST"]
    },
    {
        name: "Appointments",
        path: "/dashboard/appointments",
        icon: "calendar",
        allowedDesignations: ["OWNER", "ADMIN", "RECEPTIONIST", "DOCTOR"]
    }
];

const seedNodes = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected for seeding");

        let created = 0;
        let skipped = 0;

        for (const nodeData of DEFAULT_NODES) {
            const existing = await Node.findOne({ path: nodeData.path });

            if (existing) {
                skipped += 1;
                console.log(`Skipped (exists): ${nodeData.path}`);
                continue;
            }

            const node = new Node(nodeData);
            await node.save();
            created += 1;
            console.log(`Created: ${node.nodeId} -> ${node.path}`);
        }

        console.log(`\nSeeding complete. Created: ${created}, Skipped: ${skipped}`);
    } catch (err) {
        console.error("Seeding error:", err);
    } finally {
        await mongoose.disconnect();
        console.log("MongoDB disconnected");
    }
};

seedNodes();
