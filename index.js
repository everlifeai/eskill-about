'use strict'
const cote = require('cote')({statusLogsEnabled:false})
const u = require('elife-utils')

let ssbid
let account

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
    registerWithSSB()
    getWalletAccount()
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
    }, (err) => {
        if(err) u.showErr(err)
    })
}

/*      outcome/
 * Load the wallet account from the stellar microservice
 */
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

const ssbClient = new cote.Requester({
    name: 'elife-about -> SSB',
    key: 'everlife-ssb-svc',
})

/*      outcome/
 * Register ourselves as a feed consumer with the SSB subsystem
 */
function registerWithSSB() {
    ssbClient.send({
        type: 'register-feed-handler',
        mskey: msKey,
        mstype: 'ssb-msg',
    }, (err, ssbid_) => {
        if(err) u.showErr(err)
        else ssbid = ssbid_
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

        if(req.msg.trim() != "whoami") return cb()

        cb(null, true)
        sendReply(`I am Avatar: ${ssbid}\nWallet Account: ${account}`, req)
    })

    svc.on('ssb-msg', (req, cb) => {
        // For now we do nothing but respond to `whoami` messages
        cb()
    })

}

main()
