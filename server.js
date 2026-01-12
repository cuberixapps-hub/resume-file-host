const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const cors = require('cors');
const htmlDocx = require('html-docx-js');
const htmlToDocx = require('html-to-docx');
const fs = require('fs');

const app = express();

// Enable CORS
app.use(cors());

app.use(bodyParser.text({ type: 'text/html' }));

app.post('/generate-pdf', async (req, res) => {
    const html = req.body;
    const height = req.query.height || '800px'; // Get the height from query params, default to 1370px if not provided

    if (!html) {
        return res.status(400).send('HTML content is required');
    }

    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // Ensure all styles are applied correctly, including background colors and bold text
        await page.evaluate(() => {
            const style = document.createElement('style');
            style.innerHTML = `
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                body, html {
                    background-color: rgb(255, 255, 249) !important; /* Set the desired background color */
                }
                b, strong {
                    font-family: 'Averta CY W01', 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
                    font-weight: 700 !important;
                }
            `;
            document.head.appendChild(style);
        });

        const pdfBuffer = await page.pdf({
            width: '800px',  // Fixed width for A4-like size
            height: height,  // Dynamic height from query parameter
            printBackground: true, // Ensure background colors are rendered
        });

        await browser.close();

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=generated.pdf'
        });
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Internal Server Error');
    }
});


app.post('/generate-docx', async (req, res) => {
    let html = req.body;
    if (!html) {
        return res.status(400).send('HTML content is required');
    }

    // Wrap HTML with proper structure and bold styling
    const styledHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                b, strong {
                    font-family: Arial, sans-serif;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            ${html}
        </body>
        </html>
    `;

    try {
        const docxBuffer = await htmlToDocx(styledHtml, { orientation: 'portrait', margins: { top: 1000, right: 1000, bottom: 1000, left: 1000 } });

        // Save the file to the filesystem (optional)
        fs.writeFileSync('output.docx', docxBuffer);

        // Set the response headers to indicate a file download
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': 'attachment; filename="output.docx"',
        });

        res.send(docxBuffer);
    } catch (error) {
        console.error('Error generating DOCX:', error);
        res.status(500).send('An error occurred while generating the DOCX file');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
