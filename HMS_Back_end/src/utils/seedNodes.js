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
    let created = 0;
    let skipped = 0;

    for (const nodeData of DEFAULT_NODES) {
        const existing = await Node.findOne({ path: nodeData.path });

        if (existing) {
            skipped += 1;
            continue;
        }

        const node = new Node(nodeData);
        await node.save();
        created += 1;
    }

    console.log(`Nodes seeded. Created: ${created}, Skipped: ${skipped}`);
};

module.exports = seedNodes;
