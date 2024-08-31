const axios = require('axios');

module.exports = {
  onSuccess: async ({ utils }) => {
    console.log('Build successful! Running update-plists function...');
    
    try {
      const functionUrl = process.env.SITE_URL + '/.netlify/functions/update-plists';
      const response = await axios.get(functionUrl);
      
      console.log('Function response:', response.data);
      utils.status.show({
        title: 'Plist Update',
        summary: 'Successfully ran update-plists function',
        text: JSON.stringify(response.data)
      });
    } catch (error) {
      console.error('Error running update-plists function:', error);
      utils.status.show({
        title: 'Plist Update Error',
        summary: 'Failed to run update-plists function',
        text: error.message
      });
      utils.build.failBuild('Failed to run update-plists function');
    }
  }
};