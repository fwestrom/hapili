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
