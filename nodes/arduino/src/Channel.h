#ifndef CHANNEL_H
#define CHANNEL_H

#include "Handler.h"

class Channel {
public:
    virtual void Open() = 0;
    virtual void Poll() = 0;
};

#endif
