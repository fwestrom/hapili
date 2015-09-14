#ifndef HAPILIMESSAGE_H
#define HAPILIMESSAGE_H

#include <Arduino.h>
#include <Stream.h>
#include "Property.h"

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
        HapiliMessage::Type type;
    };

public:
    HapiliMessage(HapiliMessage::Header& header);
    ~HapiliMessage();

    uint16_t getId();
    Type getType();

private:
    HapiliMessage::Header header;
};

/// <summary>
/// Provides the functionality for reading raw Hapili messages from
/// primitive channels and data sources.
/// </summary>
class HapiliMessageReader {
public:
    HapiliMessage* Read(Stream& stream);
    void Release(HapiliMessage *hm);

private:
};

class QueryMessage : public HapiliMessage {
public:
    QueryMessage(HapiliMessage::Header& header);
};


#endif
