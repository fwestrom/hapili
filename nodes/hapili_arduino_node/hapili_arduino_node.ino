#include <SPI.h>
//#include <utilV2_0.h>
//#include <EthernetClientV2_0.h>
//#include <DhcpV2_0.h>
//#include <EthernetServerV2_0.h>
#include <EthernetV2_0.h>
//#include <DnsV2_0.h>
//#include <EthernetUdpV2_0.h>

#define W5200_CS  10
#define SDCARD_CS 4

byte mac[] = { 0xDE, 0xAD, 0xBE, 0xFF, 0xFF, 0x01 };

int dhcpSuccess = 0;

void setup()
{
    Serial.begin(115200);
    Serial.println("Starting...");
    
    pinMode(SDCARD_CS, OUTPUT);
    digitalWrite(SDCARD_CS, HIGH);
    
    while (dhcpSuccess != 1) {
        Serial.println("Attempting to obtain DHCP address.");
        dhcpSuccess = Ethernet.begin(mac);
        if (dhcpSuccess != 1) {
            Serial.println("Failed to acquire DHCP address, trying again in 5 seconds.");
            delay(5000);
        }
    }
    Serial.print("Acquired DHCP address: ");
    for (byte i = 0; i < 4; i++) {
        Serial.print(Ethernet.localIP()[i], DEC);
        Serial.print(".");
    }
    Serial.println();
    
    Serial.println("Ready.\n");
}

void loop()
{
}
