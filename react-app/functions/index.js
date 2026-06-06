const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

// UPDATE THESE FOR PRODUCTION
const APP_DOMAIN = "https://billing-software-8234d.web.app";
const MASTER_EMAIL = "balasamy8888@gmail.com";
const SMTP_CONFIG = {
    service: "gmail",
    auth: {
        user: "balasamy8888@gmail.com",
        pass: "umho nere zrjk niwf"
    }
};
const transporter = nodemailer.createTransport(SMTP_CONFIG);

/**
 * TRIGGER: On a new registration request, send the approval email to the master admin.
 */
exports.onRegistrationRequestCreate = onDocumentCreated("registration_requests/{requestId}", async (event) => {
    const requestId = event.params.requestId;
    const reqData = event.data.data();

    const approveLink = `${APP_DOMAIN}/approveRequest?requestId=${requestId}&token=${reqData.secureToken}`;
    const rejectLink = `${APP_DOMAIN}/rejectRequest?requestId=${requestId}&token=${reqData.secureToken}`;

    const mailOptions = {
        from: `"SaaS Billing Security" <${SMTP_CONFIG.auth.user}>`,
        to: MASTER_EMAIL,
        subject: `New Registration: ${reqData.companyName}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; color: #111;">
                <h2>Master Authorization Required</h2>
                <p>A new business is requesting system enrollment:</p>
                <div style="background: #f4f4f4; padding: 15px; border-radius: 8px;">
                    <p><strong>Owner:</strong> ${reqData.ownerName}</p>
                    <p><strong>Email:</strong> ${reqData.email}</p>
                    <p><strong>Company:</strong> ${reqData.companyName}</p>
                    <p><strong>ID:</strong> ${requestId}</p>
                </div>
                <div style="margin-top: 25px;">
                    <a href="${approveLink}" style="background: #10b981; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 15px;">APPROVE</a>
                    <a href="${rejectLink}" style="background: #ef4444; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">REJECT</a>
                </div>
                <p style="margin-top: 30px; font-size: 12px; color: #888;">This is an automated security protocol for balasamy8888@gmail.com.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Master notification sent for ${reqData.companyName}`);
    } catch (error) {
        console.error("Email dispatch failed:", error);
    }
});

/**
 * ENDPOINT: Approve a request using a secure token.
 */
exports.approveRequest = onRequest(async (req, res) => {
    const { requestId, token } = req.query;

    if (!requestId || !token) {
        return res.status(400).send("Security parameters missing.");
    }

    try {
        const reqRef = db.collection("registration_requests").doc(requestId);
        const reqSnap = await reqRef.get();

        if (!reqSnap.exists) {
            return res.status(404).send("Request record not found.");
        }

        const data = reqSnap.data();

        // Security check
        if (data.secureToken !== token) {
            return res.status(401).send("Unauthorized: Invalid security token.");
        }

        if (data.status !== "pending") {
            return res.status(400).send(`Action denied: This request is already ${data.status.toUpperCase()}.`);
        }

        // 1. Provisioning IDs
        const companyId = "comp_" + Math.random().toString(36).substr(2, 9);

        // 2. Create Auth User
        const userRecord = await auth.createUser({
            email: data.email,
            displayName: data.ownerName,
        });

        // 3. Generate Password Reset
        const resetLink = await auth.generatePasswordResetLink(data.email);

        // 4. Create Company
        await db.collection("companies").doc(companyId).set({
            name: data.companyName,
            ownerEmail: data.email,
            status: "active",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 5. Create Owner User Doc
        await db.collection("users").doc(userRecord.uid).set({
            uid: userRecord.uid,
            name: data.ownerName,
            email: data.email,
            role: "owner",
            companyId: companyId,
            status: "active",
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 6. Update Request status
        await reqRef.update({
            status: "approved",
            approvedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 7. Notify Success via Email to Owner
        const ownerMail = {
            from: `"SaaS Billing Support" <${SMTP_CONFIG.auth.user}>`,
            to: data.email,
            subject: `Welcome to SaaS Billing: ${data.companyName}!`,
            html: `
                <div style="font-family: sans-serif; padding: 20px;">
                    <h3>Congratulations!</h3>
                    <p>Your business request for <strong>${data.companyName}</strong> has been approved by the Master Admin.</p>
                    <p>To finalize your setup and create your password, please click the link below:</p>
                    <a href="${resetLink}" style="background: #e85d04; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin: 20px 0;">SET PASSWORD & LOGIN</a>
                    <p>Once you've set your password, you can login at your company dashboard.</p>
                </div>
            `
        };

        await transporter.sendMail(ownerMail);

        // 8. Visual Success Feedback for Admin
        res.send(`
            <div style="text-align:center; padding:50px; font-family:sans-serif;">
                <h1 style="color:#10b981;">Provisioning Complete</h1>
                <p>Company <strong>${data.companyName}</strong> has been successfully authorized.</p>
                <p>Owner <strong>${data.ownerName}</strong> has been notified to set their password.</p>
            </div>
        `);

    } catch (error) {
        console.error("Provisioning error:", error);
        res.status(500).send("Critical System Error: " + error.message);
    }
});

/**
 * ENDPOINT: Reject a request using a secure token.
 */
exports.rejectRequest = onRequest(async (req, res) => {
    const { requestId, token } = req.query;

    if (!requestId || !token) {
        return res.status(400).send("Security parameters missing.");
    }

    try {
        const reqRef = db.collection("registration_requests").doc(requestId);
        const reqSnap = await reqRef.get();

        if (!reqSnap.exists || reqSnap.data().secureToken !== token) {
            return res.status(401).send("Unauthorized or invalid request.");
        }

        const data = reqSnap.data();

        // 1. Update status
        await reqRef.update({
            status: "rejected",
            rejectedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Notify Owner (Optional)
        const rejectMail = {
            from: `"SaaS Billing Support" <${SMTP_CONFIG.auth.user}>`,
            to: data.email,
            subject: `Status Update: ${data.companyName}`,
            html: `<p>We regret to inform you that your request for ${data.companyName} system enrollment has been declined at this time.</p>`
        };
        await transporter.sendMail(rejectMail);

        res.send(`
            <div style="text-align:center; padding:50px; font-family:sans-serif;">
                <h1 style="color:#ef4444;">Request Rejected</h1>
                <p>Authorization for ${data.companyName} has been denied.</p>
            </div>
        `);

    } catch (error) {
        res.status(500).send("Critical System Error: " + error.message);
    }
});
