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

app.use(bodyParser.text({ type: 'text/html', limit: '10mb' }));

// Health check endpoint
app.get('/', (req, res) => {
    res.send('Resume File Host API is running!');
});

// CSS to map custom font names to Google Fonts
const FONT_MAPPING_CSS = `
    /* Map custom fonts to Google Fonts equivalents */
    * {
        font-family: 'DM Sans', 'Inter', sans-serif;
    }
`;

app.post('/generate-pdf', async (req, res) => {
    const html = req.body;
    const height = req.query.height || '800px';

    if (!html) {
        return res.status(400).send('HTML content is required');
    }

    // Wrap HTML with Google Fonts
    const htmlWithFonts = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Baskervville:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
            <style>
                /* Font aliases - map custom font names to Google Fonts */
                [style*="Averta Demo PE Cutted Demo"] { font-family: 'DM Sans', sans-serif !important; }
                [style*="Averta CY W01"] { font-family: 'DM Sans', sans-serif !important; }
                [style*="New York"] { font-family: 'Libre Baskerville', serif !important; }
                [style*="SF Pro Display"] { font-family: 'Inter', sans-serif !important; }
                ${FONT_MAPPING_CSS}
            </style>
        </head>
        <body>
            ${html}
        </body>
        </html>
    `;

    let browser = null;
    try {
        const launchOptions = {
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        };
        
        // Use system Chromium if available (for Docker/Render)
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }
        
        browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();
        
        // Set content and wait for fonts to load
        await page.setContent(htmlWithFonts, { waitUntil: 'networkidle0' });
        
        // Wait a bit more for fonts to fully render
        await page.evaluate(() => document.fonts.ready);

        // Replace custom fonts with Google Fonts equivalents
        await page.evaluate(() => {
            // Font replacement map
            const fontMap = {
                'Averta Demo PE Cutted Demo': "'DM Sans', sans-serif",
                'Averta CY W01': "'DM Sans', sans-serif",
                'New York': "'Libre Baskerville', serif",
                'SF Pro Display': "'Inter', sans-serif"
            };
            
            // Replace fonts in all elements with inline styles
            document.querySelectorAll('*').forEach(el => {
                const style = el.getAttribute('style');
                if (style) {
                    let newStyle = style;
                    for (const [oldFont, newFont] of Object.entries(fontMap)) {
                        newStyle = newStyle.replace(new RegExp(oldFont, 'gi'), newFont);
                    }
                    if (newStyle !== style) {
                        el.setAttribute('style', newStyle);
                    }
                }
            });
            
            // Add print styles
            const printStyle = document.createElement('style');
            printStyle.innerHTML = `
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                }
                body, html {
                    background-color: rgb(255, 255, 249) !important;
                }
                b, strong {
                    font-family: 'DM Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
                    font-weight: 700 !important;
                }
            `;
            document.head.appendChild(printStyle);
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
        if (browser) {
            await browser.close();
        }
        res.status(500).json({ 
            error: 'Failed to generate PDF', 
            message: error.message 
        });
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
