#include "Net.h"
#include "Debug.h"

#define W5200_CS  10
#define SDCARD_CS 4

Net::Net(byte *mac) : mac(mac) {
}

void Net::Setup() {
    pinMode(SDCARD_CS, OUTPUT);
    digitalWrite(SDCARD_CS, HIGH);

    int dhcpSuccess = 0;
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
}

void Net::Maintain() {
    Ethernet.maintain();
}
