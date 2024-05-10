const fs = require('fs');
const path = require('path');
const {promisify} = require('util');
const {exec} = require('child_process');
const readline = require('readline');

const execAsync = promisify(exec);

// Function to replace placeholders in a string
function replacePlaceholders(content, replacements) {
    for (const key in replacements) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        content = content.replace(regex, replacements[key]);
    }
    return content;
}

// Function to copy a file and replace placeholders
function copyTemplateFile(source, target, replacements) {
    return new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(source, 'utf8');
        const writeStream = fs.createWriteStream(target);

        readStream.on('error', reject);
        writeStream.on('error', reject);

        readStream.on('open', () => {
            const rl = readline.createInterface({
                input: readStream,
                output: writeStream,
            });

            rl.on('line', (line) => {
                const replacedLine = replacePlaceholders(line, replacements);
                writeStream.write(`${replacedLine}\n`);
            });

            rl.on('close', () => {
                writeStream.end();
                resolve();
            });
        });
    });
}

// Function to copy template files to target directory
async function copyTemplateFiles(templateDir, targetDir, replacements) {
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, {recursive: true});
    }

    const files = fs.readdirSync(templateDir);

    for (const file of files) {
        const source = path.join(templateDir, file);
        const target = path.join(targetDir, file);

        if (fs.statSync(source).isDirectory()) {
            await copyTemplateFiles(source, target, replacements);
        } else {
            await copyTemplateFile(source, target, replacements);
        }
    }
}

// Function to run npm install and npm run release
async function setupProject(directory) {
    try {
        console.log('Installing npm dependencies...');
        await execAsync('npm install', {cwd: directory});

        console.log('Creating installer package...');
        await execAsync('npm run release', {cwd: directory});

    } catch (error) {
        throw new Error(error.stderr || error);
    }
}

// Main function
async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Enter the URL: ', async (url) => {
        url = url.trim();
        const domain = new URL(url).hostname.split('.')[0];
        const targetDir = path.join(__dirname, `dist/${domain}`);
        const replacements = {URL: url, NAME: domain}; // Use domain as name for everything

        try {
            const templateDir = path.join(__dirname, 'template');
            await copyTemplateFiles(templateDir, targetDir, replacements);
            await setupProject(targetDir);
            console.log('Files copied and setup completed successfully!');
        } catch (err) {
            console.error('Error:', err.message || err);
        } finally {
            rl.close();
        }
    });
}

main();
