const { google } = require('googleapis');
const path = require('path');

// Initialize the Google APIs
const auth = new google.auth.GoogleAuth({
    credentials: {  // Change from keyFile to credentials
        type: process.env.GOOGLE_TYPE,
        project_id: process.env.GOOGLE_PROJECT_ID,
        private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_PRIVATE_KEY.split(String.raw`\n`).join('\n'),
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLIENT_ID,
        auth_uri: process.env.GOOGLE_AUTH_URI,
        token_uri: process.env.GOOGLE_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.GOOGLE_AUTH_PROVIDER_X509_CERT_URL,
        client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
        universe_domain: process.env.GOOGLE_UNIVERSE_DOMAIN
    },
    scopes: [
        'https://www.googleapis.com/auth/documents',
        'https://www.googleapis.com/auth/drive'
    ]
});

const docs = google.docs({ version: 'v1', auth });
const drive = google.drive({ version: 'v3', auth });

// Function to get or create the folder
const getOrCreateFolder = async () => {
    try {
        console.log("\n🔍 Searching for 'youtube-agent-relay' folder...");
        
        // Search for the folder
        const response = await drive.files.list({
            q: "name='youtube-agent-relay' and mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields: 'files(id, name)',
            spaces: 'drive'
        });

        console.log("📊 Search response:", JSON.stringify(response.data, null, 2));

        let folderId;
        
        // If folder exists, use its ID
        if (response.data.files && response.data.files.length > 0) {
            console.log("✅ Found existing folder: youtube-agent-relay");
            folderId = response.data.files[0].id;
        } else {
            // If folder doesn't exist, create it
            console.log("📁 Creating new folder: youtube-agent-relay");
            const folder = await drive.files.create({
                requestBody: {
                    name: 'youtube-agent-relay',
                    mimeType: 'application/vnd.google-apps.folder'
                },
                fields: 'id, name'
            });
            folderId = folder.data.id;
            console.log("✅ Created new folder with ID:", folderId);
        }

        // Share the folder with your personal account
        console.log("🔑 Sharing folder with your account...");
        await drive.permissions.create({
            fileId: folderId,
            requestBody: {
                role: 'writer',  // This gives you full access to view and edit
                type: 'user',
                emailAddress: '0109aishwarya.mxd@gmail.com'
            }
        });

        // Make the folder publicly accessible for viewing
        await drive.permissions.create({
            fileId: folderId,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        console.log("✅ Folder shared with your account and made public");
        return folderId;
    } catch (error) {
        console.error("❌ Error in getOrCreateFolder:", error.message);
        if (error.response) {
            console.error("Error response:", JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
};

// Function to write data to Google Docs
const writeToGoogleDocs = async (question, videos) => {
    try {
        console.log("📝 Starting to write to Google Docs...");
        
        // Get or create the folder
        const folderId = await getOrCreateFolder();
        console.log("📁 Using folder ID:", folderId);
        
        // Create a new document
        const document = await docs.documents.create({
            requestBody: {
                title: `Question: ${question.question} - ${new Date().toISOString()}`
            }
        });

        const documentId = document.data.documentId;
        console.log("✅ Created new document with ID:", documentId);

        // Move the document to the folder using Drive API
        console.log("📦 Moving document to folder...");
        await drive.files.update({
            fileId: documentId,
            addParents: folderId,
            removeParents: 'root',
            fields: 'id, parents'
        });
        console.log("✅ Document moved to folder successfully");

        // Share the document with your personal account
        console.log("🔑 Sharing document with your account...");
        await drive.permissions.create({
            fileId: documentId,
            requestBody: {
                role: 'writer',  // This gives you full access to view and edit
                type: 'user',
                emailAddress: '0109aishwarya.mxd@gmail.com'
            }
        });

        // Make the document publicly accessible
        console.log("🔓 Making document publicly accessible...");
        await drive.permissions.create({
            fileId: documentId,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        // Get the document's web view link
        const file = await drive.files.get({
            fileId: documentId,
            fields: 'webViewLink, parents'
        });

        const documentUrl = file.data.webViewLink;
        console.log("✅ Document is now publicly accessible at:", documentUrl);
        console.log("📁 Document parents:", file.data.parents);

        // Prepare the content
        let content = [
            { text: "Question:\n", style: { bold: true } },
            { text: question.question + "\n\n" },
            { text: "Videos Found:\n", style: { bold: true } }
        ];

        // Add each video's information
        videos.forEach((video, index) => {
            content.push(
                { text: `\nVideo ${index + 1}:\n`, style: { bold: true } },
                { text: `Title: ${video.title}\n` },
                { text: `URL: ${video.url}\n` },
                { text: `Channel: ${video.channelUrl}\n` },
                { text: `Description: ${video.description || 'No description available'}\n` },
                { text: `Transcript: ${video.transcript || 'No transcript available'}\n` }
            );
        });

        // Insert the content into the document
        await docs.documents.batchUpdate({
            documentId: documentId,
            requestBody: {
                requests: [{
                    insertText: {
                        location: {
                            index: 1
                        },
                        text: content.map(item => item.text).join('')
                    }
                }]
            }
        });

        // Update the document title using Drive API
        await drive.files.update({
            fileId: documentId,
            requestBody: {
                name: `Question: ${question.question} - DocID: ${documentId} - ${new Date().toISOString()}`
            },
            fields: 'id, name'
        });

        console.log("✅ Successfully wrote data to Google Docs");
        return {
            documentId,
            documentUrl
        };
    } catch (error) {
        console.error("❌ Error writing to Google Docs:", error.message);
        if (error.response) {
            console.error("Error response:", JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
};

module.exports = { writeToGoogleDocs }; 