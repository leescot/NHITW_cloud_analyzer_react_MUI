export function normalizeResponseData(data, dataType) {
  const recordsArray = data.rObject || data.robject;

  if (dataType === "medDays" || dataType === "labdraw") {
    return { rObject: Array.isArray(data) ? data : [data] };
  }

  if (dataType === "patientsummary") {
    return { rObject: Array.isArray(recordsArray) ? recordsArray : (recordsArray ? [recordsArray] : []) };
  }

  if (dataType === "chronicMed") {
    return { rObject: [data] };
  }

  if (dataType === "adultHealthCheck" || dataType === "cancerScreening" || dataType === "hbcvdata") {
    return { rObject: recordsArray ? [recordsArray] : [] };
  }

  return { rObject: Array.isArray(recordsArray) ? recordsArray : [] };
}
