const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const fs = require('fs');
const receveidMessage = require('./receveidMessage');

let client;
let sessionData;
let connected = false;

const SESSION_FILE_PATH = './session.json';
const QR_CODE_FILE_PATH = './qrcode.png';

// Grava arquivo de sessão para quando o servidor for reiniciado, a conexão reestabeleça
function criarArquivoDeSessao(session) {
    if (!session) {
        session = '{}';
        return;
    }

    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => {
        if (err) {
            console.error('Erro ao criar o arquivo de sessão:', err);
        } else {
            console.log('Arquivo de sessão criado com sucesso');
        }
    });
}

exports.enviarMensagem = (number, text) =>{
    if (!connected) {
        console.log('Client is not connected. Cannot send message.');
        return;
    }

    const numberId = `${number}`;
    client.sendMessage(numberId, text).then(() => {
        console.log(`Message sent to ${number}`);
    }).catch((err) => {
        console.error(`Error sending message to ${number}:`, err);
    });
}

// Verifica se existe um arquivo de sessão e carrega os dados
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionData = require(SESSION_FILE_PATH);
}

// Inicializando o client
client = new Client({
    authStrategy: new LocalAuth({ session: sessionData })
});

// Eventos do cliente
client.on('qr', async qr => {
    const qrImg = await qrcode.toDataURL(qr);
    console.log('Whatsapp - Novo token gerado')
    // Converte a URL de dados em um buffer e salva como uma imagem
    const base64Data = qrImg.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(QR_CODE_FILE_PATH, base64Data, 'base64', function (err) {
        if (err) {
            console.error(err);
        }
    });
});

client.on('ready', () => {
    console.log('Client is ready!');
    connected = true;
});

client.on('authenticated', (session) => {
    sessionData = session;
    console.log('Authenticated!');
    criarArquivoDeSessao(session);

    if (fs.existsSync(QR_CODE_FILE_PATH)) {
        fs.unlinkSync(QR_CODE_FILE_PATH);
    }
});

client.on('disconnected', (reason) => {
    console.log('Client was disconnected', reason);
    fs.unlinkSync(SESSION_FILE_PATH);
    sessionData = null;
});

client.on('message', async msg => {
    // Verifica se a mensagem recebida não é do próprio número do cliente
    if (msg.fromMe) {
        // Se a mensagem for enviada pelo próprio cliente, não faz nada
        return;
    }

    // console.log(`Mensagem recebida de ${msg.from}: ${msg.body}`);

    receveidMessage(msg.body);

});

// Inicializa o cliente
client.initialize();





