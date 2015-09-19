#include "Debug.h"
#include "Net.h"
#include "HapiliMessage.h"

#define W5200_CS  10
#define SDCARD_CS 4

byte mac[] = { 0xDE, 0xAD, 0xBE, 0xFF, 0xFF, 0x04 };

char buf[UDP_TX_PACKET_MAX_SIZE];
int dhcpSuccess = 0;
EthernetUDP sock;
HapiliMessageSerializer ms;

void setup()
{
  debuginit();
  debugln("Starting...");

  pinMode(SDCARD_CS, OUTPUT);
  digitalWrite(SDCARD_CS, HIGH);

  while (dhcpSuccess != 1) {
    debugln("Attempting to obtain DHCP address.");
    dhcpSuccess = Ethernet.begin(mac);
    if (dhcpSuccess != 1) {
      debugln("Failed to acquire DHCP address, trying again in 5 seconds.");
      delay(5000);
    }
  }
  debug("Acquired DHCP address: ");
  for (byte i = 0; i < 4; i++) {
    debug(Ethernet.localIP()[i], DEC);
    debug(".");
  }
  debugln();

  sock.begin(666);

  debugln("Ready.\n");
}

void loop()
{
  int nbytes = sock.parsePacket();
  if (nbytes > 0)
  {
    debug("udp|recv| nbytes: ");
    debugln(nbytes);

    HapiliMessage *msg = ms.Deserialize(sock);
    if (msg) {
        sock.beginPacket(sock.remoteIP(), sock.remotePort());
        AckMessage ack(*msg);
        ack.Serialize(sock);
        sock.endPacket();

        ms.Release(msg);
    }
  }
}
