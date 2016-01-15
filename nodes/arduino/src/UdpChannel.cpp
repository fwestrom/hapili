#include "UdpChannel.h"
#include "Debug.h"

class UdpMessageContext : public MessageContext {
public:
    UdpMessageContext(HapiliMessage &msg, HapiliMessageSerializer &serializer, EthernetUDP &sock);
    virtual HapiliMessage &getMessage();
    virtual void Reply(HapiliMessage &reply);

private:
    HapiliMessage &msg;
    HapiliMessageSerializer &serializer;
    EthernetUDP &sock;
};

UdpChannel::UdpChannel(uint16_t port, Handler &handler) : handler(handler) {
    this->port = port;
}

void UdpChannel::Open() {
    sock.begin(port);
    debug("UdpChannel::Open| port: ");
    debugln(port);
}

void UdpChannel::Poll() {
    int nbytes = sock.parsePacket();
    if (nbytes > 0)
    {
        debug("UdpChannel::Poll|recv| nbytes: ");
        debugln(nbytes);

        HapiliMessage *msg = serializer.Deserialize(sock);
        if (msg) {
            UdpMessageContext mc(*msg, serializer, sock);
            handler.OnMessage(mc);
            serializer.Release(msg);
        }
    }
}

UdpMessageContext::UdpMessageContext(HapiliMessage &msg, HapiliMessageSerializer &serializer, EthernetUDP &sock)
    : msg(msg), serializer(serializer), sock(sock) {
}

HapiliMessage& UdpMessageContext::getMessage() {
    return msg;
}

void UdpMessageContext::Reply(HapiliMessage &reply) {
    debugln("UdpMessageContext::Reply|");
    sock.beginPacket(sock.remoteIP(), sock.remotePort());
    serializer.Serialize(reply, sock);
    sock.endPacket();
}
