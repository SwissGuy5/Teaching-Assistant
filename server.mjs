// // === Initialisation === //
import express from "express";
const app = express();
import mysql from 'mysql';
import util from 'util';
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
import OpenAI from "openai";
import envRaw from 'dotenv';
const env = envRaw.config().parsed;
const port = env.PORT;
import fs from "fs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import multer from 'multer';
const upload = multer({ dest: './audioFiles/' })
import * as sdk from "microsoft-cognitiveservices-speech-sdk";
const speechConfig = sdk.SpeechConfig.fromSubscription(process.env.SPEECH_SERVICE_KEY, process.env.SPEECH_REGION);
speechConfig.speechRecognitionLanguage = "en-US";


// === Database Connection === //
const con = mysql.createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE
});
con.connect(function (err) {
    if (err) throw err;
    console.log("Database Reached");
});
const query = util.promisify(con.query).bind(con);


// === Open AI Fine Tuning === //
const openai = new OpenAI({
    apiKey: env.OPENAI_KEY
});
async function chatCompletion(chatHistory, decodedToken) {
    const existingModels = await query(`SELECT model_name, date FROM TA_Models WHERE class_code = ${mysql.escape(decodedToken.classCode)} ORDER BY date DESC`);
    let modelName = existingModels.length != 0 ? existingModels[0].model_name : 'gpt-3.5-turbo-0613';
    console.log(modelName);
    const chatCompletion = await openai.chat.completions.create({
        model: modelName,
        messages: chatHistory,
    });
    console.log(chatCompletion.usage);
    return chatCompletion.choices[0].message;
}
async function fineTuneModel(filePath) {
    console.log(filePath);
    const file = await openai.files.create({
        file: fs.createReadStream(filePath),
        purpose: "fine-tune",
    });
    console.log(file);
    const model = await openai.fineTuning.jobs.create({
        model: 'gpt-3.5-turbo',
        training_file: file.id,
        suffix: 'TA'
    });
    // await openai.files.del(file.idconsole.log('/api/test fetched'););
    return model;
}

// === Handle Navigation === //
app.use(express.static("client"));
app.get("/", (_, res) => {
    res.sendFile(__dirname + "/client/pages/forum.html");
});
app.get("/feedback", (_, res) => {
    res.sendFile(__dirname + "/client/pages/feedback.html");
});
app.get("/admin", (_, res) => {
    res.sendFile(__dirname + "/client/pages/admin.html");
});
app.get("/fileUpload", (_, res) => {
    res.sendFile(__dirname + "/client/pages/fileUpload.html");
});
app.get("/account", (_, res) => {
    res.sendFile(__dirname + "/client/pages/account.html");
});
app.get("/login", (_, res) => {
    res.sendFile(__dirname + "/client/pages/login.html");
});
app.get("/register", (_, res) => {
    res.sendFile(__dirname + "/client/pages/register.html");
});

app.use(express.json());
// === Handle Forum Page === //
app.post('/forum', async (req, res) => {
    const { token, thread } = req.body;
    try {
        const decodedToken = jwt.verify(token, env.JWT_KEY);
        const chatHistory = await query(`SELECT * FROM TA_Data WHERE user_id = ${decodedToken.userId} AND thread = ${thread} ORDER BY data_id ASC`);
        return res.json({
            type: 'success',
            code: 200,
            message: 'success',
            content: chatHistory
        })
    } catch (err) {
        return res.json({
            type: 'error',
            code: 401,
            message: "Invalid Token"
        });
    }
})
app.post('/getFeedback', async (req, res) => {
    const { token } = req.body;
    try {
        const decodedToken = jwt.verify(token, env.JWT_KEY);
        const user = (await query(`SELECT class_code FROM TA_Users WHERE user_id = ${mysql.escape(decodedToken.userId)}`))[0];
        const studentList = await query(`SELECT user_id FROM TA_Users WHERE class_code = ${mysql.escape(user.class_code)}`);
        let studentIds = [];
        studentList.forEach(student => {
            studentIds.push(student.user_id);
        })
        const gatheredFeedback = await query(`SELECT data_id, prompt, response, feedback, time FROM TA_Data WHERE user_id in (${studentIds.toString()}) AND feedback IS NOT NULL ORDER BY time ASC`);
        return res.json({
            type: 'success',
            code: 200,
            message: 'success',
            content: gatheredFeedback
        })
    } catch (err) {
        return res.json({
            type: 'error',
            code: 401,
            message: "Invalid Token or Query"
        });
    }
})
app.post('/sendFeedback', async (req, res) => {
    const { token, dataId, feedback } = req.body;
    try {
        const decodedToken = jwt.verify(token, env.JWT_KEY);
        await query(`UPDATE TA_Data SET feedback = ${mysql.escape(feedback)} WHERE data_id = ${mysql.escape(dataId)} AND user_id = ${mysql.escape(decodedToken.userId)}`);
        return res.json({
            type: 'success',
            code: 200,
            message: 'success'
        })
    } catch (err) {
        return res.json({
            type: 'error',
            code: 401,
            message: "Invalid Token"
        });
    }
})
app.post('/newMessage', async (req, res) => {
    const { token, userPrompt, thread } = req.body;
    try {
        const decodedToken = jwt.verify(token, env.JWT_KEY);
        const messages = await query(`SELECT prompt, response FROM TA_Data WHERE user_id = ${mysql.escape(decodedToken.userId)} AND thread = ${mysql.escape(thread)} ORDER BY data_id ASC`);
        const chatHistory = [];
        messages.forEach(message => {
            chatHistory.push({
                'role': 'user',
                'content': message.prompt
            });
            chatHistory.push({
                'role': 'assistant',
                'content': message.response
            });
        })
        chatHistory.push({
            'role': 'user',
            'content': userPrompt
        });
        const response = await chatCompletion(chatHistory, decodedToken);
        // console.log(`${mysql.escape(decodedToken.userId)}, ${mysql.escape(userPrompt)}, ${mysql.escape(response.content)}, ${thread}`);
        await query(`INSERT INTO TA_Data (user_id, thread, prompt, response) VALUES (${mysql.escape(decodedToken.userId)}, ${mysql.escape(thread)}, ${mysql.escape(userPrompt)}, ${mysql.escape(response.content)})`);
        return res.json({
            type: 'success',
            code: 200,
            message: 'new message added',
            content: [userPrompt, response.content]
        })
    } catch (err) {
        console.log(err);
        return res.json({
            type: 'error',
            code: 401,
            message: err.message
        });
    }
})
// === Handle Admin Page === //
app.post('/getFineTuningData', async (req, res) => {
    const { token } = req.body;
    try {
        const decodedToken = jwt.verify(token, env.JWT_KEY);
        const existingFineTuningData = await query(`SELECT * FROM TA_FineTuningData WHERE user_id = ${mysql.escape(decodedToken.userId)} ORDER BY fine_tuning_data_id ASC`);
        // existingFineTuningData.forEach(data => {
        //     console.log(data.date);
        // })
        return res.json({
            type: 'success',
            code: 200,
            message: 'success',
            content: existingFineTuningData
        })
    } catch (err) {
        return res.json({
            type: 'error',
            code: 401,
            message: "Invalid Token"
        });
    }
})
app.post('/newFineTunedModel', async (req, res) => {
    const { token } = req.body;
    try {
        const decodedToken = jwt.verify(token, env.JWT_KEY);
        const existingFineTuningData = await query(`SELECT * FROM TA_FineTuningData WHERE user_id = ${mysql.escape(decodedToken.userId)} ORDER BY fine_tuning_data_id ASC`);
        let formatedData = ``;
        let rows = 0;
        existingFineTuningData.forEach(row => {
            rows += 1;
            formatedData += `{"messages": [{"role": "system", "content": "${mysql.escape(row.system_content).slice(1, -1).replaceAll(`\\'`, `'`)}"}, {"role": "user", "content": "${mysql.escape(row.user_content).slice(1, -1).replaceAll(`\\'`, `'`)}"}, {"role": "assistant", "content": "${mysql.escape(row.assistant_content).slice(1, -1).replaceAll(`\\'`, `'`)}"}]}\n`;
        })
        if (rows < 10) {
            return res.json({
                type: 'error',
                code: 401,
                message: "Must have 10 datapoints minimum"
            });
        }
        console.log(formatedData);
        fs.writeFile('./fineTunedModels/fineTunedData.jsonl', formatedData, err => {
            if (err) {
                console.error(err);
            }
        });
        const model = await fineTuneModel('./fineTunedModels/fineTunedData.jsonl');
        console.log(model);
        await query(`INSERT INTO TA_Models (model_name, user_id, class_code) VALUES (${model.fine_tuned_model}, ${mysql.escape(decodedToken.userId)}, ${mysql.escape(decodedToken.classCode)})`);
        console.log('Model Instantiated, the fine tuning process takes about 15min for small data sets');
    } catch (err) {
        return res.json({
            type: 'error',
            code: 401,
            message: "Invalid Token"
        });
    }
})
app.post('/newFineTuningData', async (req, res) => {
    const { token, systemInput, userInput, assistantInput } = req.body;
    try {
        const decodedToken = jwt.verify(token, env.JWT_KEY);
        // console.log(decodedToken, systemInput, userInput, assistantInput);
        if (userInput != '' && assistantInput != '') {
            await query(`INSERT INTO TA_FineTuningData (user_id, system_content, user_content, assistant_content) VALUES (${mysql.escape(decodedToken.userId)}, ${mysql.escape(systemInput)}, ${mysql.escape(userInput)}, ${mysql.escape(assistantInput)})`);
        }
        return res.json({
            type: 'success',
            code: 200,
            message: 'success',
            content: [systemInput, userInput, assistantInput]
        })
    } catch (err) {
        return res.json({
            type: 'error',
            code: 401,
            message: "Invalid Token",
            content: err
        });
    }
})
app.post('/editFineTuningData', async (req, res) => {
    const { token, dataId, systemInput, userInput, assistantInput, date } = req.body;
    console.log(date);
    try {
        const decodedToken = jwt.verify(token, env.JWT_KEY);
        // console.log(decodedToken, dataId, systemInput, userInput, assistantInput, date);
        if (userInput != '' && assistantInput != '') {
            await query(`UPDATE TA_FineTuningData SET system_content = ${mysql.escape(systemInput)}, user_content = ${mysql.escape(userInput)}, assistant_content = ${mysql.escape(assistantInput)} WHERE fine_tuning_data_id = ${mysql.escape(dataId)}`);
            // await query(`UPDATE TA_FineTuningData SET system_content = ${mysql.escape(systemInput)}, user_content = ${mysql.escape(userInput)}, assistant_content = ${mysql.escape(assistantInput)}, date = ${mysql.escape(date)} WHERE fine_tuning_data_id = ${mysql.escape(dataId)}`);
        }
        return res.json({
            type: 'success',
            code: 200,
            message: 'success',
            content: [systemInput, userInput, assistantInput]
        })
    } catch (err) {
        return res.json({
            type: 'error',
            code: 401,
            message: "Invalid Token",
            content: err
        });
    }
})
app.post('/getTextFromAudio', upload.single('fileUpload'), async (req, res) => {
    // const { token, audio } = req.body;
    const { originalName, destination, filename } = req.file;
    try {
        // const decodedToken = jwt.verify(token, env.JWT_KEY);
        const audioPath = destination + filename;
        console.log(audioPath);
        // const audioPath = './audioFiles/TestAudioFile.wav';
        let audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(audioPath));
        let speechRecognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
        let text = '';
        speechRecognizer.recognizeOnceAsync(result => {
            switch (result.reason) {
                case sdk.ResultReason.RecognizedSpeech:
                    text = result.text;
                case sdk.ResultReason.NoMatch:
                    console.log("NOMATCH: Speech could not be recognized.");
                    break;
                case sdk.ResultReason.Canceled:
                    const cancellation = sdk.CancellationDetails.fromResult(result);
                    console.log(`CANCELED: Reason=${cancellation.reason}`);

                    if (cancellation.reason == sdk.CancellationReason.Error) {
                        console.log(`CANCELED: ErrorCode=${cancellation.ErrorCode}`);
                        console.log(`CANCELED: ErrorDetails=${cancellation.errorDetails}`);
                        console.log("CANCELED: Did you set the speech resource key and region values?");
                    }
                    break;
            }
            speechRecognizer.close();
            console.log(text);
            // return res.json({
            //     type: 'success',
            //     code: 200,
            //     message: 'success',
            //     content: text
            // })
            return res.send(text);
        });
    } catch (err) {
        return res.json({
            type: 'error',
            code: 401,
            message: "Invalid Token",
            content: err
        });
    }
})
// === Handle Account Page === //
app.post('/getUserData', async (req, res) => {
    const { token } = req.body;
    try {
        const decodedToken = jwt.verify(token, env.JWT_KEY);
        const user = (await query(`SELECT email, user_id, class_code FROM TA_Users WHERE user_id = ${mysql.escape(decodedToken.userId)}`))[0];
        const modelsList = await query(`SELECT model_name, date FROM TA_Models WHERE class_code = ${mysql.escape(user.class_code)}`);
        console.log(modelsList);
        return res.json({
            type: 'success',
            code: 200,
            message: 'success',
            content: [user, modelsList]
        })
    } catch (err) {
        console.log(err);
        return res.json({
            type: 'error',
            code: 401,
            message: "Invalid Token or Query"
        });
    }
})
// === Handle Login Page === //
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if fields are empty
        if (!(email && password)) {
            return res.json({
                type: 'error',
                code: 400,
                message: "All input fields are required"
            });
        }

        // Encrypt user password
        const encryptedPassword = await bcrypt.hash(password, 10);
        console.log(encryptedPassword);

        const user = {
            userId: null,
            email: email,
            classCode: null,
            isAdmin: 0,
            token: null
        }

        // Query Database
        const result = await query('SELECT * FROM TA_Users');
        let userFound = false;
        result.forEach(storedUser => {
            if (user.email == storedUser.email && bcrypt.compareSync(password, storedUser.password)) {
                user.userId = storedUser.user_id;
                user.classCode = storedUser.class_code;
                console.log(storedUser.class_code);
                user.isAdmin = storedUser.isAdmin;
                userFound = true;
            }
        });
        if (!userFound) {
            return res.json({
                type: 'error',
                code: 400,
                message: "User doesn't exist"
            });
        };

        // Create jsonWebToken
        const token = jwt.sign(
            // { userId: user.id },
            user,
            env.JWT_KEY,
            {
                expiresIn: "2h",
            }
        )
        user.token = token;

        // Send user
        console.log(user);
        return res.status(201).json({
            type: 'user',
            content: user
        });
    } catch (err) {
        console.log(err);
    }
});
// === Handle Register Page === //
app.post("/register", async (req, res) => {
    try {
        const { email, password, classCode } = req.body;
        // Check if fields are empty
        if (!(email && password && classCode)) {
            return res.json({
                type: 'error',
                code: 400,
                message: "All input fields are required"
            });
        }
        // Validate Email and Password
        if (!validateEmail(email)) {
            return res.json({
                type: 'error',
                code: 400,
                message: "Invalid Email"
            });
        }
        if (!validatePassword(password)) {
            return res.json({
                type: 'error',
                code: 400,
                message: "Invalid Password"
            });
        }
        if (!validateClassCode(classCode)) {
            return res.json({
                type: 'error',
                code: 400,
                message: "Invalid Class Code"
            });
        }
        const user = {
            userId: null,
            email: email,
            classCode: classCode,
            isAdmin: 0,
            token: null
        }

        //Encrypt user password
        const encryptedPassword = await bcrypt.hash(password, 10);
        console.log(encryptedPassword);

        // Query Database
        let validCode = false;
        const result = await query('SELECT email, class_code FROM TA_Users');
        result.forEach(storedUser => {
            if (classCode == storedUser.class_code) {
                validCode = true;
            }
            if (user.email == storedUser.email) {
                return res.json({
                    type: 'error',
                    code: 400,
                    message: "User already exists"
                });
            }
        });
        if (!validCode) {
            return res.json({
                type: 'error',
                code: 400,
                message: "Class Code Not Found"
            });
        }

        // Insert User into Database
        await query(`INSERT INTO TA_Users (email, password, class_code) VALUES (${mysql.escape(email)}, ${mysql.escape(encryptedPassword)}, ${mysql.escape(classCode)})`);
        const result2 = await query(`SELECT * FROM TA_Users WHERE email = ${mysql.escape(user.email)}`);
        result2.forEach(storedUser => {
            if (encryptedPassword == storedUser.password) {
                user.userId = storedUser.user_id;
                user.isAdmin = storedUser.isAdmin;
            }
        });

        // Create jsonWebToken
        const token = jwt.sign(
            // { userId: user.id },
            user,
            env.JWT_KEY,
            {
                expiresIn: "2h",
            }
        )
        user.token = token;

        // Send user
        console.log(user);
        return res.status(201).json({
            type: 'user',
            content: user
        });
    } catch (err) {
        return res.json({
            type: 'error',
            content: err.message
        });
    }
});

app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});


// === Bcrypt Encryption === //
function hash(password) {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassowrd = bcrypt.hashSync(password, salt);
    return hashedPassowrd;
}


// === Util === //
function validateEmail(email) {
    const regex = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
    return regex.test(email);
}
function validatePassword(password) {
    return password.length >= 5 ? true : false;
}
function validateClassCode(code) {
    return code.length == 8 ? true : false;
}