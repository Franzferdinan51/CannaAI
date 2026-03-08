/**
 * DOMMatrix Polyfill for Node.js environments
 * Required by pdfjs-dist for page transformations and viewport calculations
 */

export class DOMMatrix {
  m11: number = 1;
  m12: number = 0;
  m13: number = 0;
  m14: number = 0;
  m21: number = 0;
  m22: number = 1;
  m23: number = 0;
  m24: number = 0;
  m31: number = 0;
  m32: number = 0;
  m33: number = 1;
  m34: number = 0;
  m41: number = 0;
  m42: number = 0;
  m43: number = 0;
  m44: number = 1;

  constructor(init?: string | number[]) {
    if (init) {
      if (typeof init === 'string') {
        const values = init.split(/[,()\s]+/).filter(Boolean).map(Number);
        if (values.length >= 6) {
          [this.m11, this.m12, this.m21, this.m22, this.m41, this.m42] = values.slice(0, 6);
        }
      } else if (Array.isArray(init)) {
        [
          this.m11, this.m12, this.m13, this.m14,
          this.m21, this.m22, this.m23, this.m24,
          this.m31, this.m32, this.m33, this.m34,
          this.m41, this.m42, this.m43, this.m44
        ] = [...init, ...Array(16).fill(0)].slice(0, 16);
      }
    }
  }

  multiply(other: DOMMatrix): DOMMatrix {
    const result = new DOMMatrix();
    result.m11 = this.m11 * other.m11 + this.m12 * other.m21 + this.m13 * other.m31 + this.m14 * other.m41;
    result.m12 = this.m11 * other.m12 + this.m12 * other.m22 + this.m13 * other.m32 + this.m14 * other.m42;
    result.m21 = this.m21 * other.m11 + this.m22 * other.m21 + this.m23 * other.m31 + this.m24 * other.m41;
    result.m22 = this.m21 * other.m12 + this.m22 * other.m22 + this.m23 * other.m32 + this.m24 * other.m42;
    result.m41 = this.m41 * other.m11 + this.m42 * other.m21 + this.m43 * other.m31 + this.m44 * other.m41;
    result.m42 = this.m41 * other.m12 + this.m42 * other.m22 + this.m43 * other.m32 + this.m44 * other.m42;
    return result;
  }

  inverse(): DOMMatrix {
    // Simple 2D inverse for affine transformations
    const det = this.m11 * this.m22 - this.m12 * this.m21;
    if (det === 0) return this;
    const result = new DOMMatrix();
    result.m11 = this.m22 / det;
    result.m12 = -this.m12 / det;
    result.m21 = -this.m21 / det;
    result.m22 = this.m11 / det;
    result.m41 = -(this.m41 * result.m11 + this.m42 * result.m21);
    result.m42 = -(this.m41 * result.m12 + this.m42 * result.m22);
    return result;
  }

  getTransform() {
    return {
      a: this.m11,
      b: this.m12,
      c: this.m21,
      d: this.m22,
      e: this.m41,
      f: this.m42,
      isInvertible: (this.m11 * this.m22 - this.m12 * this.m21) !== 0,
      invertSelf: () => this.inverse()
    };
  }

  // Additional methods used by pdfjs-dist
  translate(x: number, y: number): DOMMatrix {
    const result = new DOMMatrix();
    result.m41 = x;
    result.m42 = y;
    return this.multiply(result);
  }

  scale(sx: number, sy?: number): DOMMatrix {
    const result = new DOMMatrix();
    result.m11 = sx;
    result.m22 = sy ?? sx;
    return this.multiply(result);
  }

  rotate(angle: number): DOMMatrix {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const result = new DOMMatrix();
    result.m11 = cos;
    result.m12 = sin;
    result.m21 = -sin;
    result.m22 = cos;
    return this.multiply(result);
  }

  flipX(): DOMMatrix {
    const result = new DOMMatrix();
    result.m11 = -1;
    return this.multiply(result);
  }

  flipY(): DOMMatrix {
    const result = new DOMMatrix();
    result.m22 = -1;
    return this.multiply(result);
  }

  toString(): string {
    return `matrix(${this.m11}, ${this.m12}, ${this.m21}, ${this.m22}, ${this.m41}, ${this.m42})`;
  }

  toFloat32Array(): Float32Array {
    return new Float32Array([
      this.m11, this.m12, this.m13, this.m14,
      this.m21, this.m22, this.m23, this.m24,
      this.m31, this.m32, this.m33, this.m34,
      this.m41, this.m42, this.m43, this.m44
    ]);
  }

  is2D: boolean = true;
  isIdentity: boolean = true;

  static fromMatrix(other: DOMMatrix): DOMMatrix {
    const result = new DOMMatrix();
    Object.assign(result, other);
    return result;
  }

  static fromFloat32Array(array: Float32Array): DOMMatrix {
    return new DOMMatrix(Array.from(array));
  }
}

// Export as default for webpack ProvidePlugin
export default DOMMatrix;
