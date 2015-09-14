#include "HapiliMessage.h"

HapiliMessage* HapiliMessageReader::Read(Stream& stream) {
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
            return new HapiliMessage(header);
    }

    return NULL;
}

void HapiliMessageReader::Release(HapiliMessage* hm) {
    if (hm) {
        delete hm;
    }
}

HapiliMessage::HapiliMessage(HapiliMessage::Header& header) : header(header) {
}

HapiliMessage::~HapiliMessage() {
}

uint16_t HapiliMessage::getId() {
    return header.id;
}

HapiliMessage::Type HapiliMessage::getType() {
    return header.type;
}

QueryMessage::QueryMessage(HapiliMessage::Header& header) : HapiliMessage(header) {
}
