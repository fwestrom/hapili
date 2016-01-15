#include "HapiliMessage.h"
#include "Debug.h"

HapiliMessage* HapiliMessageSerializer::Deserialize(Stream& stream) {
    size_t nbytes = stream.available();
    if (nbytes < sizeof(HapiliMessage::Header)) {
        debug("Unexpected packet size ");
        debug(nbytes);
        debugln();
        return NULL;
    }

    HapiliMessage::Header header;
    nbytes = stream.readBytes((byte*)&header, (size_t)sizeof(HapiliMessage::Header));
    if (nbytes < sizeof(HapiliMessage::Header)) {
        debug("Unexpected packet size ");
        debug(nbytes);
        debugln();
        return NULL;
    }

    if (header.version != 1) {
        debug("Unexpected HapiliMessage version ");
        debug(header.version);
        debugln();
    }

    HapiliMessage *msg;
    switch (header.type) {
        case HapiliMessage::Set:
            debugln("SetMessage");
            msg = new SetMessage(header);
            break;

        case HapiliMessage::Configure:
            debugln("ConfigureMessage");
            msg = new ConfigureMessage(header);
            break;

        case HapiliMessage::Query:
        default:
            debugln("QueryMessage");
            msg = new QueryMessage(header);
            break;
    }

    msg->Deserialize(stream, true);
    return msg;
}

void HapiliMessageSerializer::Release(HapiliMessage *msg) {
    if (msg) {
        delete msg;
    }
}

void HapiliMessageSerializer::Serialize(HapiliMessage &msg, UDP &stream) {
    msg.Serialize(stream);
}

HapiliMessage::HapiliMessage(HapiliMessage::Header& header) : header(header) {
}

HapiliMessage::~HapiliMessage() {
}

void HapiliMessage::Deserialize(Stream& stream, bool skipHeader) {
    if (!skipHeader) {
        stream.readBytes((char*)&header, (size_t)sizeof(Header));
    }
}

uint16_t HapiliMessage::getId() {
    return header.id;
}

HapiliMessage::Type HapiliMessage::getType() {
    return header.type;
}

void HapiliMessage::Serialize(UDP& to) {
    to.write((byte*)&header, sizeof(Header));
}

QueryMessage::QueryMessage(HapiliMessage::Header& header) : HapiliMessage(header) {
}

SetMessage::SetMessage(HapiliMessage::Header& header) : HapiliMessage(header), updates(1) {
}

void SetMessage::Deserialize(Stream& stream, bool skipHeader) {
    HapiliMessage::Deserialize(stream, skipHeader);

    updates.clear();
    while ((size_t)stream.available() >= sizeof(Update)) {
        Update update;
        stream.readBytes((char*)&update, (size_t)sizeof(Update));
        updates.push_back(update);
    }
}

std::vector<SetMessage::Update> SetMessage::getUpdates() {
    return updates;
}

ConfigureMessage::ConfigureMessage(HapiliMessage::Header& header) : HapiliMessage(header) {
}

void ConfigureMessage::Deserialize(Stream& stream, bool skipHeader) {
    HapiliMessage::Deserialize(stream, skipHeader);

    pinModes.clear();
    while ((size_t)stream.available() >= sizeof(PinMode)) {
        PinMode pinMode;
        stream.readBytes((char*)&pinMode, (size_t)sizeof(PinMode));
        pinModes.push_back(pinMode);
    }
}

std::vector<ConfigureMessage::PinMode> ConfigureMessage::getPinModes() {
    return pinModes;
}

AckMessage::AckMessage(HapiliMessage& msg) : HapiliMessage(msg.header) {
    header.type = HapiliMessage::Ack;
}

void AckMessage::Serialize(UDP& stream) {
    HapiliMessage::Serialize(stream);
}
