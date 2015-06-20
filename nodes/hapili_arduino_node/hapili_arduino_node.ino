#include <SPI.h>
#include <DhcpV2_0.h>
//#include <DnsV2_0.h>
//#include <EthernetClientV2_0.h>
//#include <EthernetServerV2_0.h>
#include <EthernetV2_0.h>
#include <EthernetUdpV2_0.h>
//#include <Messenger.h>
//#include <utilV2_0.h>

#define W5200_CS  10
#define SDCARD_CS 4

byte mac[] = { 0xDE, 0xAD, 0xBE, 0xFF, 0xFF, 0x01 };

char buf[UDP_TX_PACKET_MAX_SIZE];
int dhcpSuccess = 0;
EthernetServer server = EthernetServer(80);
EthernetUDP sock;
//Messenger message = Messenger();

void onMessageReady();

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

  server.begin();
  sock.begin(666);

//  message.attach(onMessageReady);

  Serial.println("Ready.\n");
}

void loop()
{
  EthernetClient client = server.available();
  if (client == true) {
    char c = client.read();
    Serial.print(c);
  }

  int nbytes = sock.parsePacket();
  if (nbytes > 0)
  {
    
      Serial.print("udp|recv| nbytes: ");
      Serial.print(nbytes);

      sock.read(buf, UDP_TX_PACKET_MAX_SIZE);
      Serial.print(", data: ");
      Serial.println(String(buf).substring(0, nbytes));
      sock.beginPacket(sock.remoteIP(), sock.remotePort());
      sock.write(buf, nbytes);
//      for (int i = nbytes; i < nbytes; i++)
//          message.process(buf[i]);
      sock.endPacket();
  }
}

void onMessageReady()
{
    
}


