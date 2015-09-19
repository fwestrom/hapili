#include "Debug.h"
#include "Hub.h"
#include "UdpChannel.h"
#include "AckHandler.h"

byte macAddress[] = { 0xDE, 0xAD, 0xBE, 0xFF, 0xFF, 0x04 };

Hub hub;
Net net(macAddress);
UdpChannel udpChannel(666, hub);

void setup()
{
  debuginit();
  debugln("Starting...");

  hub.Register(new AckHandler());
  net.Setup();
  udpChannel.Open();

  debugln("Ready.\n");
}

void loop()
{
    udpChannel.Poll();
    net.Maintain();
}
