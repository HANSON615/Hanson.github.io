
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const apiKey = process.env.GEMINI_API_KEY;

console.log('=== Testing Gemini API ===');
console.log('API Key:', apiKey ? `Loaded (length: ${apiKey.length})` : 'NOT FOUND');

if (!apiKey) {
  console.error('ERROR: No API Key found!');
  process.exit(1);
}

const testPrompt = '你好，請用台灣繁體中文回覆';

console.log('\nTesting API call...');
console.log('API URL:', GEMINI_API_URL);

axios.post(`${GEMINI_API_URL}?key=${apiKey}`, {
  contents: [{
    role: 'user',
    parts: [{ text: testPrompt }]
  }]
})
.then(response => {
  console.log('\n✅ API Call SUCCESS!');
  console.log('Status:', response.status);
  console.log('Response:', JSON.stringify(response.data, null, 2));
  
  const aiResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log('\nAI Response:', aiResponse);
})
.catch(error => {
  console.error('\n❌ API Call FAILED!');
  console.error('Error:', error.message);
  if (error.response) {
    console.error('Response Status:', error.response.status);
    console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
  }
  process.exit(1);
});

