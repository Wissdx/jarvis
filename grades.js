import { existsSync, lstatSync, readFileSync, writeFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config()

const cachePath = './cache/previousGrades.json';

export async function sendNewGrades(discordClient) {
    let token = await getAccessToken();

    const bearerHeader = {
        'Authorization': `Bearer ${token}`
    };

    let currentGrades = [];
    try {
        currentGrades = await fetchAllGrades(bearerHeader);
    } catch (error) {
        console.error('Error fetching grades:', error);
        return;
    }

    if (!existCacheFile()) {
        saveGradesData(currentGrades);
        return;
    }

    const previousGrades = loadPreviousGrades();
    let coursesWithNewGrades = getNewGrades(currentGrades, previousGrades);

    if (coursesWithNewGrades.length < 1) {
        return;
    }

    let isMultiple = coursesWithNewGrades.length > 1
    const message = `💯 ATTENTION 💯\n\n  nouvelle${isMultiple ? 's' : ''} note${isMultiple ? 's' : ''} 🙊:\n- ${coursesWithNewGrades.join('\n- ')}`;

    const channel = await discordClient.channels.fetch(process.env.GRADES_CHANNEL_ID);
    if (channel) {
        await channel.send(message);
    }

    saveGradesData(currentGrades);

}

async function fetchAllGrades(header) {
    const currentSchoolYear = getCurrentSchoolYear();
    const url = `https://api.kordis.fr/me/${currentSchoolYear}/grades`;

    const response = await fetch(url, {
        method: 'GET',
        headers: header
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const grades = await response.json();
    return grades.result;
}

function getNewGrades(currentGrades, previousGrades) {
    const coursesWithNewGrades = []
    currentGrades.forEach((course) => {
        const courseName = course.course;
        const newGrades = course.grades;
        const previousCourse = previousGrades.find(course => course.course === courseName);
        const previousCourseGrades = previousCourse.grades;


        if (newGrades.length > previousCourseGrades.length) {
            coursesWithNewGrades.push(courseName);
        }

        previousGrades[courseName] = newGrades;
    });

    return coursesWithNewGrades
}

function loadPreviousGrades() {
    if (existsSync(cachePath)) {
        const data = readFileSync(cachePath, 'utf8');
        return JSON.parse(data);
    }
    return {};
}

async function getAccessToken() {
    const username = process.env.MYGES_API_USERNAME;
    const password = process.env.MYGES_API_PASSWORD;

    const loginUrl = 'https://authentication.kordis.fr/oauth/authorize?response_type=token&client_id=skolae-app';

    const encoded = getEncodedCredentials(username, password)

    try {
        const response = await fetch(loginUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${encoded}`
            },
            redirect: 'manual'
        });

        const locationHeader = response.headers.get('location');
        if (!locationHeader) {
            throw new Error('No location header found');
        }

        const match = locationHeader.match(/comreseaugesskolae:\/oauth2redirect#access_token=(.*)&token_type=bearer/);
        if (!match) {
            throw new Error('Token not found in location header');
        }

        const token = match[1];
        return token;
    } catch (error) {
        console.error('Error fetching token:', error);
    }
}

function existCacheFile() {
    return existsSync(cachePath) && lstatSync(cachePath).isFile
}

function saveGradesData(gradesData) {
    writeFileSync(cachePath, JSON.stringify(gradesData, null, 2), 'utf8');
}

function getCurrentSchoolYear() {
    const currentDate = new Date();
    const month = currentDate.getMonth();
    let year = currentDate.getFullYear();

    const OCTOBER = 9;

    if (month < OCTOBER) {
        year -= 1;
    }
    return year;
}

function getEncodedCredentials(username, password) {
    return Buffer.from(`${username}:${password}`).toString('base64');
}