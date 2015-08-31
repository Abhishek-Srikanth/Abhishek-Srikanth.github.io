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
