const sanitizeQualifications = (qualifications = []) => {
  const trimmedQualifications = qualifications.map((qualification) =>
    qualification.trim(),
  );
  const nonEmptyQualifications = trimmedQualifications.filter(
    (qualification) => qualification.length > 0,
  );
  const uniqueQualifications = [...new Set(nonEmptyQualifications)];
  return uniqueQualifications;
};

module.exports = sanitizeQualifications;