const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const cors = require('cors');
const htmlDocx = require('html-docx-js'); // Add this line
const htmlToDocx = require('html-to-docx');
const fs = require('fs');


const app = express();

// Enable CORS
app.use(cors());

app.use(bodyParser.text({ type: 'text/html' }));

// Endpoint to generate PDF
app.post('/generate-pdf', async (req, res) => {
    const html = req.body;
    if (!html) {
        return res.status(400).send('HTML content is required');
    }

    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // Ensure all styles are applied correctly, including background colors
        await page.evaluate(() => {
            const style = document.createElement('style');
            style.innerHTML = `
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
            `;
            document.head.appendChild(style);
        });

        const pdfBuffer = await page.pdf({
            // Format the PDF to 595px x 842px (A4 size)
            width: '800px',
            height: '1370px',
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
    const html = req.body;
    if (!html) {
        return res.status(400).send('HTML content is required');
    }

    try {
        const docxBuffer = await htmlToDocx(html, { orientation: 'portrait', margins: { top: 1000, right: 1000, bottom: 1000, left: 1000 } });

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
