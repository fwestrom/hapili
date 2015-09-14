#ifndef HAPILIMESSAGE_H
#define HAPILIMESSAGE_H

#include <Arduino.h>
#include <Stream.h>
#include <Udp.h>
#include <StandardCplusplus.h>
#include <vector>

class HapiliMessage;

/// <summary>
/// Provides the functionality for reading raw Hapili messages from
/// primitive channels and data sources.
/// </summary>
class HapiliMessageSerializer {
public:
    HapiliMessage* Deserialize(Stream& stream);
    void Release(HapiliMessage *hm);
};

/// <summary>
/// Describes a Hapili message.
/// </summary>
class HapiliMessage {
public:
    enum Type : uint16_t {
        Query = 0,
        Set = 1,
    };

    struct Header {
        uint16_t id;
        Type type;
    };

    uint16_t getId();
    Type getType();

protected:
    HapiliMessage(Header& header);
    virtual ~HapiliMessage();
    virtual void Deserialize(Stream& stream, bool skipHeader);
    virtual void SerializeHeader(UDP& to);

private:
    Header header;

    friend class HapiliMessageSerializer;
};

class QueryMessage : public HapiliMessage {
protected:
    virtual void Serialize(Stream& stream);

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
    virtual void Serialize(Stream& stream);

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
    virtual void Serialize(Stream& stream);

private:
    std::vector<PinMode> pinModes;
};

#endif
