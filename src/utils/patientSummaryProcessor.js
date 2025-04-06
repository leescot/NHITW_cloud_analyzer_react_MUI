export const patientSummaryProcessor = {
  processPatientSummaryData(data) {
    // console.log('patientsummary - Processing data:', data);

    if (!data || !data.rObject || !Array.isArray(data.rObject)) {
      console.log('patientsummary - Invalid format:', data);
      return [];
    }

    try {
      // Format each entry in the patient summary data
      const formattedData = data.rObject.map((item, index) => {
        return {
          id: index + 1,
          text: this.stripHtmlTags(item.txt || ''), // Remove HTML tags
          iconImage: item.img || '',
          originalText: item.txt || '' // Keep original text with HTML formatting
        };
      });

      // console.log('patientsummary - Processed data:', formattedData);
      return formattedData;
    } catch (error) {
      console.error('patientsummary - Error processing data:', error);
      console.error('Error details:', error.stack);
      return [];
    }
  },

  // Helper function to strip HTML tags from text
  stripHtmlTags(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  }
};