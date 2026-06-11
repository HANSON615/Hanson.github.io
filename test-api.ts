import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-1.5-flash-latest';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

console.log('Testing Gemini API...');
console.log('API Key:', API_KEY ? 'Loaded' : 'Not found');
console.log('API URL:', API_URL);

async function testAPI() {
  try {
    const response = await axios.post(`${API_URL}?key=${API_KEY}`, {
      contents: [{
        role: 'user',
        parts: [{ text: '你好，請用繁體中文回覆' }]
      }]
    });

    console.log('Success! Response:', response.data.candidates[0].content.parts[0].text);
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Full error response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAPI();