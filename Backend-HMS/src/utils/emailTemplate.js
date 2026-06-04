exports.verificationEmailTemplate = (name, verificationUrl) => {
    return `
    <div style=" padding: 18px 24px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; ">
        <h2 style=" margin: 0; color: #1f2937; font-size: 22px; "> 
            HMS Account Verification 
        </h2> 
        </div>
            <div style="padding: 24px;">
             <p style=" margin: 0 0 16px 0; color: #374151; font-size: 15px; "> 
                Hello <strong>${name}</strong>,
            </p> 
            <p style=" margin: 0 0 16px 0; color: #4b5563; line-height: 1.6; font-size: 15px; "> 
                 Welcome to HMS. Please verify your email address to activate your account. 
            </p> 
            <div style="margin: 28px 0;"> 
                <a href="${verificationUrl}" style=" display: inline-block; padding: 12px 24px; background: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; " > 
                    Verify Account </a>
            </div>
            <p style=" margin: 0 0 12px 0; color: #6b7280; font-size: 14px; "> 
                This verification link will expire in 24 hours. 
            </p> 
            <p style=" margin: 0; color: #6b7280; font-size: 14px; "> 
                If you did not request this account, you can safely ignore this email. 
            </p> 
        </div> 
        <div style=" padding: 14px 24px; background: #f8fafc; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; text-align: center; "> 
            Hospital Management System (HMS) 
        </div> 
    </div>
  `;
};