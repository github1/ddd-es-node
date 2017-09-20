module.exports = class Something {
  constructor() {
    this.typeNameMetaData = 'Something';
  }
};

class ComplexEvent extends EntityEvent {
  constructor(complexType) {
    super();
    this.complexType = complexType;
  }
}

class ComplexType {
  constructor(value) {
    this.typeNameMetaData = this.constructor.name;
    this.value = value;
  }
}

exports.ComplexEvent = ComplexEvent;
exports.ComplexType = ComplexType;
