#define DEBUGSERIAL 1
#define NODE 2

#if NODE == 1
 #define MEGA
 #define W5200
#elif NODE == 2
 #define MEGA
 #define W5100
#elif NODE >= 3
 #define ENC
#endif

#include <EEPROM.h>
#include <Bounce2.h>


#ifdef W5100
 #include <SPI.h>
 #include <Ethernet.h>
 #include <EthernetUdp.h>
 #define W5X00_CS  10
 #define SDCARD_CS 4
#endif
#ifdef W5200
 #include <SPI.h>
 #include <DhcpV2_0.h>
 #include <EthernetV2_0.h>
 #include <EthernetUdpV2_0.h>
 #define W5X00_CS  10
 #define SDCARD_CS 4
#endif
#ifdef ENC
 #include <UIPEthernet.h>
#endif

byte mac[] = { 0xDE, 0xAD, 0xBE, 0xFF, 0xFF, NODE };

byte pins[] = {
    #ifdef MEGA
     23, 22, 25, 24, 27, 26, 29, 28, 31, 30, 33, 32, 35, 34, 37, 36
    #else
     0, 1, 3, 4, 5, 6, 7, 8, 9
    #endif
};

byte inputs[] = {
    #ifdef MEGA
    50, 51, 52, 53
    #endif
};
Bounce* inputBounces = NULL;


byte buf[1024];
unsigned int loopCount = 0;
unsigned int port = 666;
EthernetUDP sock;

void OnPacket(EthernetUDP sock, size_t nbytes);

/// <summary>
/// Initializes the node.
/// </summary>
void setup()
{
    #if DEBUGSERIAL
    Serial.begin(115200);
    Serial.println("Starting...");
    #endif

    for (unsigned int i=0; i < sizeof(pins); i++) {
        pinMode(pins[i], OUTPUT);
        digitalWrite(pins[i], HIGH);
    }

    inputBounces = new Bounce[sizeof(inputs)];
    for (unsigned int i=0; i < sizeof(inputs); i++) {
        byte pin = inputs[i];
        pinMode(pin, INPUT_PULLUP);
        Bounce bounce = Bounce();
        bounce.attach(pin);
        bounce.interval(5);
        inputBounces[i] = bounce;
    }

    #ifdef SDCARD_CS
    pinMode(SDCARD_CS, OUTPUT);
    digitalWrite(SDCARD_CS, HIGH);
    #endif

    int dhcpSuccess = 0;
    while (dhcpSuccess != 1) {
        #if DEBUGSERIAL
        Serial.println("Attempting to obtain DHCP address.");
        #endif
        dhcpSuccess = Ethernet.begin(mac);
        if (dhcpSuccess != 1) {
            #if DEBUGSERIAL
            Serial.println("Failed to acquire DHCP address, trying again in 5 seconds.");
            #endif
            delay(3000);
        }
    }

    #if DEBUGSERIAL
    Serial.print("Acquired DHCP address: ");
    for (byte i = 0; i < 4; i++) {
        Serial.print(Ethernet.localIP()[i], DEC);
        Serial.print(".");
    }
    Serial.println();
    #endif

    sock.begin(port);

    #if DEBUGSERIAL
    Serial.println("Ready.\n");
    #endif
}

/// <summary>
/// Invoked repeatedly to allow the node to perform its duties.
/// </summary>
void loop()
{
    for (unsigned int i = 0; i < sizeof(inputs); i++) {
        Bounce bounce = inputBounces[i];
        bounce.update();
        if (bounce.fell() || bounce.rose()) {
            SendInputStateMessage(sock, inputs[i], bounce.read());
        }
    }

    size_t nbytes = sock.parsePacket();
    if (nbytes > 0) {
        nbytes = sock.read(buf, min(nbytes, sizeof(buf)));
        OnMessage(buf, nbytes, sock);
        while (sock.available()) {
            sock.read();
        }
        sock.stop();
        sock.begin(port);
    }
    else if (++loopCount >= 1000) {
        loopCount = 0;
        Ethernet.maintain();
    }
}

/// <summary>
/// Invoked to process an incoming message.
/// </summary>
void OnMessage(byte *buf, size_t nbytes, EthernetUDP sock)
{
    OnMessageV0(buf, nbytes, sock);
}

void OnMessageV0(byte *buf, size_t nbytes, EthernetUDP sock)
{
    size_t off = 0;
    unsigned int msgId = 0;
    ((byte*)&msgId)[1] = buf[off++];
    ((byte*)&msgId)[0] = buf[off++];

    byte msgType = buf[off++];

    #if DEBUGSERIAL
    Serial.print("udp|recv| from: ");
    Serial.print(sock.remoteIP());
    Serial.print(":");
    Serial.print(sock.remotePort());
    Serial.print(", nbytes: ");
    Serial.print(nbytes);
    Serial.print(", msgId: ");
    Serial.print(msgId);
    Serial.print(", msgType: ");
    Serial.print(msgType);
    Serial.println("");
    #endif

    switch (msgType) {
        case 1:
            OnMessageV0Type1(msgId, buf, off, nbytes, sock);
            break;

        case 26:
            OnMessageV0Type26(msgId, buf, off, nbytes, sock);

        default:
            OnMessageV0Type0(msgId, buf, off, nbytes, sock);
            break;
    }

    if (msgType == 1) {
    }
    else {
    }
}

// Query message
void OnMessageV0Type0(unsigned int msgId, byte *buf, size_t off, size_t nbytes, EthernetUDP sock)
{
    size_t offReply = 0;
    for (unsigned int i = 0; i < sizeof(pins); i++) {
        buf[offReply++] = digitalRead(pins[i]);
    }

    OnMessageV0SendReply(msgId, buf, offReply, sock);
}

// Set message
void OnMessageV0Type1(unsigned int msgId, byte *buf, size_t off, size_t nbytes, EthernetUDP sock)
{
    byte id = buf[off++];
    byte value = buf[off++];
    digitalWrite(pins[id], value);

    size_t offReply = 0;
    for (unsigned int i = 0; i < sizeof(pins); i++) {
        buf[offReply++] = i == id ? value : digitalRead(pins[i]);
    }

    OnMessageV0SendReply(msgId, buf, offReply, sock);
}

int OnMessageV0SendReply(unsigned int msgId, byte *buf, size_t nbytes, EthernetUDP sock)
{
    IPAddress remoteIp = sock.remoteIP();
    unsigned int remotePort = sock.remotePort();

    #if DEBUGSERIAL
    Serial.print("udp|send| to: ");
    Serial.print(remoteIp);
    Serial.print(":");
    Serial.print(remotePort);
    Serial.print(", nbytes: ");
    Serial.print(nbytes);
    Serial.print(", msgId: ");
    Serial.print(msgId);
    #endif

    #ifdef ENC
    sock.stop();
    sock.begin(port);
    #endif

    int result1 = sock.beginPacket(remoteIp, remotePort);
    sock.write(((byte*)&msgId)[1]);
    sock.write(((byte*)&msgId)[0]);
    sock.write(buf, nbytes);
    int result2 = sock.endPacket();

    #if DEBUGSERIAL
    Serial.print(", result1: ");
    Serial.print(result1);
    Serial.print(", result2: ");
    Serial.println(result2);
    #endif

    return result2;
}

// Configure message
void OnMessageV0Type26(unsigned int msgId, byte *buf, size_t off, size_t nbytes, EthernetUDP sock)
{

}

// Send input state message
void SendInputStateMessage(EthernetUDP sock, byte inputPin, byte value)
{
    IPAddress remoteIp(255, 255, 255, 255);
    unsigned int remotePort = 666;
    sock.stop();
    sock.begin(remotePort);

    int result1 = sock.beginPacket(remoteIp, remotePort);
    sock.write((byte)16);
    sock.write((byte)inputPin);
    sock.write((byte)value);

    int result2 = sock.endPacket();
}
