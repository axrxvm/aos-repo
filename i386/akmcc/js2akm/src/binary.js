/**
 * AKMBinaryWriter - AKM Binary Format Writer
 * 
 * Writes the final .akm binary file format matching akm_header_v2_t.
 * Header is exactly 512 bytes as defined in kmodule_api.h
 */

const { AKM_FORMAT, CAPABILITIES } = require('./constants');

class AKMBinaryWriter {
    constructor(options = {}) {
        this.options = options;
    }

    /**
     * Write AKM binary file
     * Layout matches akm_header_v2_t from kmodule_api.h exactly
     */
    write(codegenResult, moduleInfo) {
        const code = codegenResult.code;
        const data = codegenResult.data;

        // Build symbol table
        const symtab = this.buildSymbolTable(codegenResult);
        
        // Build string table
        const strtab = this.buildStringTable(codegenResult.strings);

        // Calculate section offsets (header is 512 bytes)
        const headerSize = 512;
        const codeOffset = headerSize;
        const codeSize = code.length;
        const dataOffset = codeOffset + codeSize;
        const dataSize = data.length;
        const symtabOffset = dataOffset + dataSize;
        const symtabSize = symtab.length;
        const strtabOffset = symtabOffset + symtabSize;
        const strtabSize = strtab.length;
        const totalSize = strtabOffset + strtabSize;

        // Create header buffer (512 bytes)
        const headerBuf = Buffer.alloc(512);
        let offset = 0;

        // === Basic identification (64 bytes) ===
        
        // magic (4 bytes) - 0x324D4B41 "AKM2"
        headerBuf.writeUInt32LE(0x324D4B41, offset);
        offset += 4;

        // format_version (2 bytes)
        headerBuf.writeUInt16LE(2, offset);
        offset += 2;

        // flags (2 bytes)
        let flags = 0;
        if (this.options.debug) flags |= 0x0001;
        headerBuf.writeUInt16LE(flags, offset);
        offset += 2;

        // header_size (4 bytes)
        headerBuf.writeUInt32LE(512, offset);
        offset += 4;

        // total_size (4 bytes)
        headerBuf.writeUInt32LE(totalSize, offset);
        offset += 4;

        // Padding to reach 64 bytes for basic identification
        // We're at offset 16, need to pad to 64? No - let's follow struct exactly

        // === Module info (96 bytes) ===
        // Starting at offset 16

        // name (32 bytes)
        this.writeFixedString(headerBuf, offset, moduleInfo.name, 32);
        offset += 32;

        // version (16 bytes)
        this.writeFixedString(headerBuf, offset, moduleInfo.version, 16);
        offset += 16;

        // author (32 bytes)
        this.writeFixedString(headerBuf, offset, moduleInfo.author, 32);
        offset += 32;

        // api_version (2 bytes) - as uint16
        headerBuf.writeUInt16LE(moduleInfo.apiVersion & 0xFFFF, offset);
        offset += 2;

        // reserved1 (2 bytes)
        offset += 2;

        // === Kernel compatibility (16 bytes) ===
        // Starting at offset 100

        // kernel_min_version (4 bytes)
        headerBuf.writeUInt32LE(moduleInfo.kernelMinVersion, offset);
        offset += 4;

        // kernel_max_version (4 bytes)
        headerBuf.writeUInt32LE(moduleInfo.kernelMaxVersion, offset);
        offset += 4;

        // capabilities (4 bytes)
        headerBuf.writeUInt32LE(moduleInfo.capabilities, offset);
        offset += 4;

        // reserved2 (4 bytes)
        offset += 4;

        // === Section info (48 bytes) ===
        // Starting at offset 116

        // code_offset (4 bytes)
        headerBuf.writeUInt32LE(codeOffset, offset);
        offset += 4;

        // code_size (4 bytes)
        headerBuf.writeUInt32LE(codeSize, offset);
        offset += 4;

        // data_offset (4 bytes)
        headerBuf.writeUInt32LE(dataOffset, offset);
        offset += 4;

        // data_size (4 bytes)
        headerBuf.writeUInt32LE(dataSize, offset);
        offset += 4;

        // rodata_offset (4 bytes)
        headerBuf.writeUInt32LE(0, offset);
        offset += 4;

        // rodata_size (4 bytes)
        headerBuf.writeUInt32LE(0, offset);
        offset += 4;

        // bss_size (4 bytes)
        headerBuf.writeUInt32LE(0, offset);
        offset += 4;

        // reserved3[5] (20 bytes)
        offset += 20;

        // === Entry points (16 bytes) ===
        // Starting at offset 164

        // init_offset (4 bytes)
        headerBuf.writeUInt32LE(codegenResult.initOffset, offset);
        offset += 4;

        // cleanup_offset (4 bytes)
        headerBuf.writeUInt32LE(codegenResult.exitOffset, offset);
        offset += 4;

        // reserved4[2] (8 bytes)
        offset += 8;

        // === Symbol/string tables (32 bytes) ===
        // Starting at offset 180

        // symtab_offset (4 bytes)
        headerBuf.writeUInt32LE(symtabOffset, offset);
        offset += 4;

        // symtab_size (4 bytes)
        headerBuf.writeUInt32LE(symtabSize, offset);
        offset += 4;

        // strtab_offset (4 bytes)
        headerBuf.writeUInt32LE(strtabOffset, offset);
        offset += 4;

        // strtab_size (4 bytes)
        headerBuf.writeUInt32LE(strtabSize, offset);
        offset += 4;

        // reserved5[4] (16 bytes)
        offset += 16;

        // === Dependencies (136 bytes) ===
        // Starting at offset 212

        // dep_count (1 byte)
        const depCount = Math.min(moduleInfo.dependencies.length, 4);
        headerBuf.writeUInt8(depCount, offset);
        offset += 1;

        // reserved6[3] (3 bytes)
        offset += 3;

        // dependencies[4][32] (128 bytes)
        for (let i = 0; i < 4; i++) {
            if (i < depCount && moduleInfo.dependencies[i]) {
                this.writeFixedString(headerBuf, offset, moduleInfo.dependencies[i], 32);
            }
            offset += 32;
        }

        // === Security (104 bytes) ===
        // Starting at offset 344

        // security_level (1 byte)
        headerBuf.writeUInt8(moduleInfo.securityLevel || 0, offset);
        offset += 1;

        // signature_type (1 byte)
        headerBuf.writeUInt8(0, offset);
        offset += 1;

        // reserved7[2] (2 bytes)
        offset += 2;

        // header_checksum (4 bytes) - calculate later
        const checksumOffset = offset;
        offset += 4;

        // content_checksum (4 bytes)
        const contentChecksum = this.calculateChecksum(
            Buffer.concat([code, data, symtab, strtab])
        );
        headerBuf.writeUInt32LE(contentChecksum, offset);
        offset += 4;

        // signature[64] (64 bytes)
        offset += 64;

        // reserved8[28] (28 bytes)
        offset += 28;

        // === Padding (64 bytes) ===
        // _padding[64] to reach 512 bytes
        // Already zeroed by Buffer.alloc

        // Calculate and write header checksum (excluding the checksum field itself)
        const headerForChecksum = Buffer.concat([
            headerBuf.slice(0, checksumOffset),
            headerBuf.slice(checksumOffset + 4)
        ]);
        const headerChecksum = this.calculateChecksum(headerForChecksum);
        headerBuf.writeUInt32LE(headerChecksum, checksumOffset);

        // Concatenate all sections
        return Buffer.concat([headerBuf, code, data, symtab, strtab]);
    }

    /**
     * Write a fixed-length string to buffer
     */
    writeFixedString(buffer, offset, str, maxLen) {
        const s = (str || '').slice(0, maxLen - 1);
        buffer.write(s, offset, 'utf8');
    }

    /**
     * Build symbol table
     */
    buildSymbolTable(codegenResult) {
        const entries = [];
        const { functions } = codegenResult;

        let nameOffset = 0;
        for (const [name, offset] of functions) {
            const entry = Buffer.alloc(12);
            entry.writeUInt32LE(nameOffset, 0);      // Name offset
            entry.writeUInt32LE(offset, 4);          // Value
            entry.writeUInt16LE(0, 8);               // Size (unknown)
            entry.writeUInt8(AKM_FORMAT.SYM_FUNC, 10);  // Type
            entry.writeUInt8(AKM_FORMAT.BIND_GLOBAL, 11); // Binding
            entries.push(entry);
            nameOffset += name.length + 1;
        }

        return Buffer.concat(entries);
    }

    /**
     * Build string table
     */
    buildStringTable(strings) {
        const parts = strings.map(s => Buffer.from(s + '\0', 'utf8'));
        return Buffer.concat(parts);
    }

    /**
     * Calculate checksum
     */
    calculateChecksum(data) {
        let checksum = 0;
        for (let i = 0; i < data.length; i++) {
            checksum += data[i];
            checksum = ((checksum << 1) | (checksum >>> 31)) >>> 0;
        }
        return checksum;
    }
}

module.exports = { AKMBinaryWriter };
