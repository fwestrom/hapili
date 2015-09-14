#include "HapiliMessage.h"

HapiliMessage* HapiliMessageSerializer::Deserialize(Stream& stream) {
    if ((size_t)stream.available() < sizeof(HapiliMessage::Header)) {
        return NULL;
    }

    HapiliMessage::Header header;;
    size_t nbytes = stream.readBytes((char*)&header, (size_t)sizeof(HapiliMessage::Header));
    if (nbytes < sizeof(HapiliMessage::Header)) {
        return NULL;
    }

    switch (header.type) {
        case HapiliMessage::Query:
            return new QueryMessage(header);

        case HapiliMessage::Set:
            return new SetMessage(header);
    }

    return NULL;
}

void HapiliMessageSerializer::Release(HapiliMessage* hm) {
    if (hm) {
        delete hm;
    }
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

void HapiliMessage::SerializeHeader(UDP& to) {
    to.write((uint8_t*)&header, (size_t)sizeof(Header));
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
