const PATIENT_SAFE_PROJECTION =
    "-passwordHash -resetPasswordTokenHash -resetPasswordTokenExpiry -__v";

const toSafePatient = (patient) => {
    const safe = patient.toObject();
    delete safe.passwordHash;
    delete safe.resetPasswordTokenHash;
    delete safe.resetPasswordTokenExpiry;
    delete safe.__v;
    return safe;
};

module.exports = { toSafePatient, PATIENT_SAFE_PROJECTION };
