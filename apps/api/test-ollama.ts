const test = async () => {
  const modelName = process.argv[2] || 'qwen3.5:4b';
  console.log(`Testing model: ${modelName}`);
  try {
    const res = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        model: modelName,
        messages: [{role: 'user', content: 'hello'}],
        stream: false
      })
    });
    console.log('Status:', res.status);
    console.log('Response:', await res.text());
  } catch(e) {
    console.error('Error:', e);
  }
};
test();
