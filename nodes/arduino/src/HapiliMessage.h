#ifndef HAPILIMESSAGE_H
#define HAPILIMESSAGE_H

#include <Arduino.h>
#include <Stream.h>
#include <StandardCplusplus.h>
#include <vector>
#include "Net.h"

class HapiliMessage;

/// <summary>
/// Provides the functionality for reading raw Hapili messages from
/// primitive channels and data sources.
/// </summary>
class HapiliMessageSerializer {
public:
    HapiliMessage* Deserialize(Stream& stream);
    void Release(HapiliMessage *msg);
    void Serialize(HapiliMessage &msg, UDP &sock); // TODO: Replace UDP with writable stream of some sort
};

/// <summary>
/// Describes a Hapili message.
/// </summary>
class HapiliMessage {
public:
    enum Type : uint8_t {
        Query = 0,
        Set = 1,
        Configure = 26,
        Ack = 128,
    };

    struct Header {
        uint8_t version;
        uint16_t id;
        Type type;
    };

    uint16_t getId();
    Type getType();

protected:
    HapiliMessage(Header& header);
    virtual ~HapiliMessage();
    virtual void Deserialize(Stream& stream, bool skipHeader);
    virtual void Serialize(UDP& stream);
    Header header;

    friend class HapiliMessageSerializer;
    friend class AckMessage;
};

class QueryMessage : public HapiliMessage {
private:
    QueryMessage(HapiliMessage::Header& header);

    friend class HapiliMessageSerializer;
};

class SetMessage : public HapiliMessage {
public:
    struct Update {
        uint8_t id;
        uint8_t value;
    };

    std::vector<Update> getUpdates();

protected:
    virtual void Deserialize(Stream& stream, bool skipHeader);

private:
    SetMessage(HapiliMessage::Header& header);
    std::vector<Update> updates;

    friend class HapiliMessageSerializer;
};

class ConfigureMessage : public HapiliMessage {
public:
    struct PinMode {
        uint8_t id;
        uint8_t mode;
    };

    std::vector<PinMode> getPinModes();

protected:
    virtual void Deserialize(Stream& stream, bool skipHeader);

private:
    ConfigureMessage(HapiliMessage::Header& header);
    std::vector<PinMode> pinModes;

    friend class HapiliMessageSerializer;
};

class AckMessage : public HapiliMessage {
public:
    AckMessage(HapiliMessage& msg);

protected:
    virtual void Serialize(UDP& stream);

private:
};

#endif
