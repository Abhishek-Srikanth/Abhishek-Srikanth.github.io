# ECE 362 - Microcontroller design



## Module 1

### Addressing modes

1. **Immediate Addressing Mode**
  * programmer provides value to be acted upon <br>
  * This value is hard-coded and not read from memory <br>
  * eg. <code> movl $1,%eax </code>
    * move value "1" into register eax
2. **Direct Addressing Mode**
  * The address of mentioned location/variable is acted upon
  * eg. <code> movl $data1,%ecx </code>
    * address of variable data1 is stored into register ecx
3. **Register Addressing Mode**
  * Moving data in and out of a register
  * Since eax and ecx are registers, above examples hold true
4. **Indexed Addressing Mode**
  ```ruby
  .data
  data1 10,11,22,33,44,55,66,77,88,99
  ...
  _start:
  movl $0,%edi ; direct addressing here. Index register
  movl data(,%edi,4),%eax
  ; movl addr_or_offset(%base_or_offset,%index,multiplier)
  ; index : index location
  ; multiplier : space taken by each block of memory
  ;              eg: long takes 4 blocks
  ; IF %edi was some other value, that location would be
  ;    extracted and the content be saved into eax
  ```
5. **Indirect Addressing Mode**
  * Store memory address in register
  * Access register to get address to read that location to get value
  * example still due
6. **Base Pointer Addressing Mode**
  * Given a pointer to an address, Can get data at pointed location and other nearby locations by using offsets

  ```ruby
  pushl $7
  pushl $8
  pushl $77
  pushl %ebp ; save value of base ptr to stack, now can overwrite
  movl %esp,%ebp ; over-write base ptr with stack ptr

  movl 4(%ebp),%eax ; save 4+esp (77) to eax register
  movl 8(%ebp),%eax  ;
  movl 12(%ebp),%eax ; base pointer addressing
  ```

### Addressing Modes (IIT-M)

Consider having an operation:
ADD X,Y
[opcode | source operand  | destionation operand]
[opcode | (mode,register) | (mode,register) ]
(mode : ~16 codes) (register : ~8 registers)

We need a way to address the data points X and Y

1. **Register**
  * The register itself holds the data
2. **Direct Addressing Mode**
  * The register holds address of a location that contains payload
  * (Needs one machine cycle - puts data on bus once)
3. **Indirect (Deffered) Addressing Mode**
  * The register holds the address of a location that then holds the address of another location which contains payload
  > Consider Register in CPU to have address "1000"<br>
    In the Memory, let us have locations numbers 1000 to 1200<br>
    Let value in address "1000" be the address "1010"<br>
    Here, register points to 1000 in memory which points to 1010 in memory, which in turn contains the final payload.

  * (Needs 2 machine cycles)
4. **Index Mode**
  * An index Value / Displacement, say 'X' is provided
  * The Register address is added with 'X' to arrive to the Final/Expected address
  * Register is called Base register
5. **Index Deffered Mode**
  * Here, the Final?Expected Address points to another final address
6. **Auto-(Increment|Decrement) Mode**
  * Register holds address
  * After the data required is extracted, the register value is incremented or decremented
7. **Immediate Mode**
  * Here the address is available as part of the instruction
  * No need to use the register
8. **Relative Addressing**
  * Usually, program counter is used instead of register
  * Relative allows you to see how far away in either direction of base
