#ifndef NET_H
#define NET_H

#define USE_ETHERNET2

#include <SPI.h>
#ifdef USE_ETHERNET2
#include <DhcpV2_0.h>
#include <EthernetV2_0.h>
#include <EthernetUdpV2_0.h>
#else
#include <Dhcp.h>
#include <Ethernet.h>
#include <EthernetUdp.h>
#endif

class Net {
public:
    Net(byte mac[]);
    void Setup();
    void Maintain();

private:
    byte *mac;
};

#endif
