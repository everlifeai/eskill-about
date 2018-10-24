'use strict'
const cote = require('cote')({statusLogsEnabled:false})
const u = require('elife-utils')

/*      understand/
 * This is the main entry point where we start.
 *
 *      outcome/
 * Start our microservice and register with the communication manager
 * and SSB.
 */
function main() {
    startMicroservice()
    registerWithCommMgr()
    getWalletAccount()
    getAvatarID()
}

const commMgrClient = new cote.Requester({
    name: 'elife-about -> CommMgr',
    key: 'everlife-communication-svc',
})

function sendReply(msg, req) {
    req.type = 'reply'
    req.msg = msg
    commMgrClient.send(req, (err) => {
        if(err) u.showErr(err)
    })
}


let msKey = 'everlife-about'
/*      outcome/
 * Register ourselves as a message handler with the communication
 * manager.
 */
function registerWithCommMgr() {
    commMgrClient.send({
        type: 'register-msg-handler',
        mskey: msKey,
        mstype: 'msg',
        mshelp: [
            { cmd: '/whoami', txt: 'show avatar and wallet details' },
            { cmd: '/set_nickname', txt: 'set your nickname' },
        ],
    }, (err) => {
        if(err) u.showErr(err)
    })
}

const ssbClient = new cote.Requester({
    name: 'elife-about -> SSB',
    key: 'everlife-ssb-svc',
})

/*      outcome/
 * Get the avatar id
 */
let avatarid
function getAvatarID() {
    ssbClient.send({ type: 'avatar-id' }, (err, id) => {
        if(err) u.showErr(err)
        else avatarid = id
    })
}

/*      outcome/
 * Load the wallet account from the stellar microservice
 */
let account
function getWalletAccount() {
    const stellarClient = new cote.Requester({
        name: 'elife-about -> Stellar',
        key: 'everlife-stellar-svc',
    })

    stellarClient.send({
        type: 'account-id',
    }, (err, acc_) => {
        if(err) u.showErr(err)
        else account = acc_
    })
}

function startMicroservice() {

    /*      understand/
     * The microservice (partitioned by key to prevent
     * conflicting with other services.
     */
    const svc = new cote.Responder({
        name: 'Everlife About-You Service',
        key: msKey,
    })

    svc.on('msg', (req, cb) => {
        if(!req.msg) return cb()

        const rx = /^\/set_nickname  *(.*)/i
        let m = req.msg.match(rx)
        if(m && m.length>=2){
            cb(null,true)

            ssbClient.send({
                type:'new-msg',
                msg: {
                    type: 'about',
                    name: m[1],
                },
            }, (err) => {
                if(err) {
                    u.showErr(err)
                    sendReply(`Error setting nickname`)
                } else {
                    sendReply(`Your avatar nickname is updated..`,req)
                }
            })
        } else if(req.msg.trim() == "/whoami") {
            // TODO: show nickname also
            cb(null, true)
            sendReply(`I am Avatar: ${ssbid}\nWallet Account: ${account}`, req)
        }
        else {
            return cb()
        }
    })
}

main()
