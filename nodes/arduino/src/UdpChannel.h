#ifndef UDPCHANNEL_H
#define UDPCHANNEL_H

#include "Channel.h"
#include "Net.h"

class UdpChannel : public Channel {
public:
    UdpChannel(uint16_t port, Handler &handler);
    virtual void Open();
    virtual void Poll();

private:
    byte buf[UDP_TX_PACKET_MAX_SIZE];
    Handler &handler;
    uint16_t port;
    HapiliMessageSerializer serializer;
    EthernetUDP sock;
};

#endif
