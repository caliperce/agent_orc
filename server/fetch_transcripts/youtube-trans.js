const { YoutubeTranscript } = require('youtube-transcript');
const fs = require('fs').promises;
const path = require('path');

async function getTranscript(url,question) {
    console.log(question);
    console.log(url);
    console.log("--------------------------------");

    // Try up to 5 times to get the transcript
    let transcript = null;
    let attempts = 0;
    const maxAttempts = 5;

    while (!transcript && attempts < maxAttempts) {
        try {
            attempts++;
            console.log(`Attempt ${attempts} to fetch transcript...`);
            transcript = await YoutubeTranscript.fetchTranscript(url);
        } catch (error) {
            console.log(`Failed attempt ${attempts}: ${error.message}`);
            if (attempts === maxAttempts) {
                console.log("Max attempts reached, giving up");
                throw new Error("Failed to fetch transcript after 5 attempts");
            }
            // Wait 1 second before trying again
            await new Promise(resolve => setTimeout(resolve, 6000));
        }
    }

    console.log(transcript);
    await saveTranscriptToFile(transcript, question);
    return transcript;
}
async function saveTranscriptToFile(transcript,question) {
    const filePath = path.join(__dirname, 'Youtube_fetched_transcript_url_2.json');
    await fs.writeFile(filePath, JSON.stringify({question:question,transcript:transcript}, null, 2));
    console.log('Transcript saved successfully to Youtube_fetched_transcript_url_2.json');
}
module.exports = {
    getTranscript
}

getTranscript("https://youtu.be/4OyB3hFb2AA?si=p_UOuk9XWla2vZMI","what happened here?");







